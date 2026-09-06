import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useCoach, Decision } from '@/lib/context';
import { getBasicStrategy, Action } from '@/lib/strategy';
import { Card, GameHand, canDouble, canSplit, cardLabel, cardRankForStrategy, createShoe, dealerShouldHit, draw, handTotal, isBlackjack, settleHand, settleInsurance } from '@/lib/game';
import { CardView } from '@/components/CardView';
import { Chip, ChipStack } from '@/components/Chip';

type Phase = 'betting' | 'dealing' | 'insurance' | 'playing' | 'settled';
const chips = [5, 25, 100, 250, 500];
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const buzz = (kind: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => { if (Platform.OS !== 'web') Haptics.impactAsync(kind); };
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SessionScreen() {
  const { activeSession, endSession, recordHand } = useCoach();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rules = activeSession?.rules;

  const [bankroll, setBankroll] = useState(1000);
  const [bet, setBet] = useState(0);
  const [lastBet, setLastBet] = useState(25);
  const [shoe, setShoe] = useState<Card[]>(() => createShoe(rules?.decks ?? 6));
  const [dealer, setDealer] = useState<Card[]>([]);
  const [hands, setHands] = useState<GameHand[]>([]);
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>('betting');
  const [lastNet, setLastNet] = useState(0);

  const [insuranceBet, setInsuranceBet] = useState(0);
  const [insuranceNet, setInsuranceNet] = useState<number | undefined>(undefined);

  const decisionsRef = useRef<Decision[]>([]);
  const endingRef = useRef(false);
  const [message, setMessage] = useState('PLACE YOUR BET');

  useEffect(() => { if (!activeSession && !endingRef.current) router.replace('/'); }, [activeSession, router]);

  const current = hands[active];
  const used = (rules?.decks ?? 6) * 52 - shoe.length;
  const isShort = SCREEN_HEIGHT <= 740;

  const dealDraw = (cards: Card[], currentShoe: Card[]) => { const next = draw(currentShoe); return { cards: [...cards, next.card], shoe: next.shoe }; };

  const addDecision = (action: Action, hand: GameHand) => {
    if (!rules || !dealer[0]) return;
    const cards = hand.cards.map(cardRankForStrategy);
    const up = cardRankForStrategy(dealer[0]);
    const correct = getBasicStrategy(cards, up, rules);
    const entry = { id: uid(), playerCards: cards, dealerCard: up, chosen: action, correct, isCorrect: correct === action };
    decisionsRef.current = [...decisionsRef.current, entry];
  };

  const settle = async (finalHands: GameHand[], initialDealer: Card[], currentShoe: Card[], forcedInsNet?: number, forcedInsBet?: number) => {
    setPhase('settled');
    let dealerCards = initialDealer;
    const needDealer = finalHands.some(h => !h.surrendered && handTotal(h.cards).total <= 21 && !isBlackjack(h));

    await new Promise(r => setTimeout(r, 400));
    setDealer([...dealerCards]);

    if (needDealer) {
      while (dealerShouldHit(dealerCards, rules!)) {
        await new Promise(r => setTimeout(r, 450));
        const next = draw(currentShoe);
        dealerCards = [...dealerCards, next.card];
        currentShoe = next.shoe;
        setDealer(dealerCards);
        buzz(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    await new Promise(r => setTimeout(r, 450));
    const resolved = finalHands.map(hand => ({ ...hand, ...settleHand(hand, dealerCards) }));
    const credit = resolved.reduce((sum, hand) => sum + settleHand(hand, dealerCards).credit, 0);
    const totalBet = resolved.reduce((sum, hand) => sum + hand.bet, 0);

    const actualInsNet = forcedInsNet !== undefined ? forcedInsNet : (insuranceNet ?? 0);
    const actualInsBet = forcedInsBet !== undefined ? forcedInsBet : (insuranceBet ?? 0);
    const net = credit - totalBet + actualInsNet;

    setBankroll(value => value + credit);
    setHands(resolved);
    setShoe(currentShoe);
    setLastNet(net);

    const outcome = net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Push';
    recordHand({
       id: uid(),
       decisions: decisionsRef.current,
       outcome,
       bet: totalBet,
       netChange: net,
       insuranceBet: actualInsBet > 0 ? actualInsBet : undefined,
       insuranceNet: actualInsNet !== 0 ? actualInsNet : undefined,
       dealerCards: dealerCards.map(cardLabel),
       playerHands: resolved.map(h => ({ cards: h.cards.map(cardLabel), bet: h.bet, outcome: h.outcome!, netChange: settleHand(h, dealerCards).credit - h.bet }))
    });

    setMessage(net > 0 ? `YOU WON $${net}` : net < 0 ? `DEALER WINS` : 'PUSH');
    buzz(net >= 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  };

  const advance = async (updated: GameHand[], shoeNow: Card[], index: number) => {
    const next = updated.findIndex((hand, i) => i > index && !hand.surrendered && handTotal(hand.cards).total <= 21 && (!hand.splitAces || canSplit(hand, rules!, updated.length)));
    if (next >= 0) {
       setHands(updated); setShoe(shoeNow); setActive(next); setPhase('playing'); return;
    }
    await settle(updated, dealer, shoeNow);
  };

  const deal = async () => {
    if (!rules || bet <= 0 || bet > bankroll) return;

    const currentBet = bet;
    setBankroll(value => value - currentBet);
    setLastBet(currentBet);
    setBet(0);
    setPhase('dealing');
    setMessage('DEALING...');
    setInsuranceBet(0);
    setInsuranceNet(undefined);
    decisionsRef.current = [];

    let fresh = shoe.length < Math.round(rules.decks * 52 * .28) ? createShoe(rules.decks) : shoe;
    let a = draw(fresh); const playerOne = a.card;
    a = draw(a.shoe); const up = a.card;
    a = draw(a.shoe); const playerTwo = a.card;
    a = draw(a.shoe); const hole = a.card;
    const initialHand: GameHand = { id: uid(), cards: [playerOne, playerTwo], bet: currentBet, doubled: false, surrendered: false, splitAces: false, fromSplit: false };

    setDealer([]);
    setHands([{ ...initialHand, cards: [] }]);
    setShoe(a.shoe);

    await new Promise(r => setTimeout(r, 350));
    setHands([{ ...initialHand, cards: [playerOne] }]);
    buzz(Haptics.ImpactFeedbackStyle.Light);

    await new Promise(r => setTimeout(r, 350));
    setDealer([up]);
    buzz(Haptics.ImpactFeedbackStyle.Light);

    await new Promise(r => setTimeout(r, 350));
    setHands([{ ...initialHand, cards: [playerOne, playerTwo] }]);
    buzz(Haptics.ImpactFeedbackStyle.Light);

    await new Promise(r => setTimeout(r, 350));
    setDealer([up, hole]);
    buzz(Haptics.ImpactFeedbackStyle.Medium);

    setActive(0);

    if (up.rank === 'A') {
      setPhase('insurance');
      setMessage('INSURANCE?');
      return;
    }

    const dealerHasBJ = handTotal([up, hole]).total === 21;
    const playerHasBJ = isBlackjack(initialHand);

    if (dealerHasBJ || playerHasBJ) {
      setTimeout(() => settle([{...initialHand}], [up, hole], a.shoe), 400);
      return;
    }

    setPhase('playing');
    setMessage('YOUR TURN');
  };

  const buyInsurance = async () => {
     const insBet = hands[0]?.bet ? hands[0].bet / 2 : 0;
     if (insBet <= 0) return;
     if (bankroll < insBet) return;

     decisionsRef.current = [...decisionsRef.current, { id: uid(), playerCards: hands[0].cards.map(cardRankForStrategy), dealerCard: 'A', chosen: 'I', correct: 'N', isCorrect: false }];

     setBankroll(v => v - insBet);
     setInsuranceBet(insBet);
     setPhase('dealing');
     await resolveInsurance(insBet);
  };

  const declineInsurance = async () => {
     decisionsRef.current = [...decisionsRef.current, { id: uid(), playerCards: hands[0].cards.map(cardRankForStrategy), dealerCard: 'A', chosen: 'N', correct: 'N', isCorrect: true }];
     setPhase('dealing');
     await resolveInsurance(0);
  };

  const resolveInsurance = async (insBet: number) => {
     const up = dealer[0];
     const hole = dealer[1];
     const dealerBJ = handTotal([up, hole]).total === 21;
     const playerBJ = isBlackjack(hands[0]);
     const insuranceResult = settleInsurance(insBet, dealerBJ);

     await new Promise(r => setTimeout(r, 400));

     if (dealerBJ) {
        setInsuranceNet(insuranceResult.net);
        if (insuranceResult.credit > 0) {
           setBankroll(v => v + insuranceResult.credit);
        }
        await settle(hands, dealer, shoe, insuranceResult.net, insBet);
     } else {
        setInsuranceNet(insuranceResult.net);
        if (playerBJ) {
           await settle(hands, dealer, shoe, insuranceResult.net, insBet);
        } else {
           setPhase('playing');
           setMessage('YOUR TURN');
        }
     }
  }

  const act = async (action: Action) => {
    if (!current || !rules || phase !== 'playing') return;
    addDecision(action, current);
    buzz(Haptics.ImpactFeedbackStyle.Medium);

    if (action === 'H') {
      if (current.splitAces) return;
      setPhase('dealing');
      await new Promise(r => setTimeout(r, 200));
      const next = dealDraw(current.cards, shoe);
      const updated = hands.map((h, i) => i === active ? { ...h, cards: next.cards } : h);
      setHands(updated);
      setShoe(next.shoe);
      if (handTotal(next.cards).total > 21) {
         await new Promise(r => setTimeout(r, 450));
         await advance(updated, next.shoe, active);
      } else {
         setPhase('playing');
      }
      return;
    }

    if (action === 'S') { await advance(hands, shoe, active); return; }

    if (action === 'R') {
      const updated = hands.map((h, i) => i === active ? { ...h, surrendered: true } : h);
      await advance(updated, shoe, active);
      return;
    }

    if (action === 'D') {
      if (bankroll < current.bet) return;
      setPhase('dealing');
      setBankroll(v => v - current.bet);
      const updated = hands.map((h, i) => i === active ? { ...h, bet: h.bet * 2, doubled: true } : h);
      setHands(updated);

      await new Promise(r => setTimeout(r, 300));
      const next = dealDraw(current.cards, shoe);
      const updatedWithCard = updated.map((h, i) => i === active ? { ...h, cards: next.cards } : h);
      setHands(updatedWithCard);
      setShoe(next.shoe);

      await new Promise(r => setTimeout(r, 450));
      await advance(updatedWithCard, next.shoe, active);
      return;
    }

    if (action === 'P') {
      if (bankroll < current.bet || !canSplit(current, rules, hands.length)) return;
      setPhase('dealing');
      setBankroll(v => v - current.bet);

      const aces = current.cards[0].rank === 'A';
      const left: GameHand = { ...current, id: uid(), cards: [current.cards[0]], bet: current.bet, fromSplit: true, splitAces: aces, doubled: false, surrendered: false };
      const right: GameHand = { ...current, id: uid(), cards: [current.cards[1]], bet: current.bet, fromSplit: true, splitAces: aces, doubled: false, surrendered: false };
      let updated = [...hands.slice(0, active), left, right, ...hands.slice(active + 1)];
      setHands(updated);

      await new Promise(r => setTimeout(r, 350));
      let a = draw(shoe);
      updated[active].cards = [...updated[active].cards, a.card];
      setHands([...updated]);

      await new Promise(r => setTimeout(r, 350));
      let b = draw(a.shoe);
      updated[active + 1].cards = [...updated[active + 1].cards, b.card];
      setHands([...updated]);
      setShoe(b.shoe);

      await new Promise(r => setTimeout(r, 450));
      if (aces) {
         await advance(updated, b.shoe, active - 1);
      } else {
         setPhase('playing');
      }
    }
  };

  const newHand = () => {
    setDealer([]);
    setHands([]);
    decisionsRef.current = [];
    setActive(0);
    setPhase('betting');
    setMessage(bankroll >= 5 ? 'PLACE YOUR BET' : 'OUT OF CHIPS');
  };

  const addChip = (amount: number) => {
    if (phase === 'betting' && bet + amount <= bankroll) {
      setBet(v => v + amount);
      buzz();
    }
  };

  const end = () => {
    endingRef.current = true;
    const id = endSession(bankroll);
    if (id) router.replace(`/report/${id}`);
    else router.replace('/');
  };

  const getOutcomeStyle = (outcome?: string) => {
    if (outcome === 'Win' || outcome === 'Blackjack') return styles.badgeWin;
    if (outcome === 'Push') return styles.badgePush;
    return styles.badgeLoss;
  };

  if (!activeSession || !rules) return null;
  const canD = current && bankroll >= current.bet && canDouble(current, rules);
  const canP = current && bankroll >= current.bet && canSplit(current, rules, hands.length);
  const canR = current && current.cards.length === 2 && !current.fromSplit && rules.surrender === 'late';
  const handsScale = hands.length > 2 ? 0.75 : hands.length > 1 ? 0.9 : 1;
  const insuranceStake = hands[0]?.bet ? hands[0].bet / 2 : 0;

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 8) + (Platform.OS === 'web' ? 40 : 0) }]}>

      <View style={styles.tableLayout}>
        {/* Dealer Equipment */}
        <View style={styles.dealerEquip}>
          <View style={styles.discardTray}>
            <View style={styles.discardStack} />
          </View>
          <View style={styles.chipRack}>
             <View style={[styles.rackStack, { backgroundColor: '#E63946' }]} />
             <View style={[styles.rackStack, { backgroundColor: '#28A745' }]} />
             <View style={[styles.rackStack, { backgroundColor: '#212529' }]} />
             <View style={[styles.rackStack, { backgroundColor: '#1C39BB' }]} />
             <View style={[styles.rackStack, { backgroundColor: '#6C5B7B' }]} />
          </View>
          <View style={styles.shoeOuter}>
            <View style={styles.shoeStack} />
            <View style={styles.shoeWall} />
          </View>
        </View>

        {/* Dealer Cards */}
        <View style={[styles.dealerCards, isShort && { minHeight: 100 }]}>
          <View style={styles.handHeader}>
            <View style={[styles.handTotalBadge, { opacity: (phase === 'settled' || phase === 'playing') ? 1 : 0 }]}>
              <Text style={styles.handTotalText}>{phase === 'settled' ? handTotal(dealer).total : '?'}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            {dealer.map((card, i) => <CardView key={card.id} card={card} index={i} hidden={i === 1 && (phase === 'playing' || phase === 'dealing' || phase === 'insurance')} isShort={isShort} />)}
          </View>
        </View>

        {/* Table Rules Typography */}
        <View style={[styles.feltRules, isShort && { marginVertical: 6 }]}>
          <Text style={[styles.markRulesBig, isShort && { fontSize: 16 }]}>BLACKJACK PAYS 3 TO 2</Text>
          <Text style={[styles.markRulesSmall, isShort && { fontSize: 10 }]}>{rules?.dealerHitsSoft17 ? 'DEALER MUST HIT SOFT 17' : 'DEALER STANDS ON ALL 17'}</Text>
          <Text style={[styles.markRulesSmall, isShort && { fontSize: 10 }]}>INSURANCE PAYS 2 TO 1</Text>
        </View>

        {/* Center Felt - Betting & Player Cards */}
        <View style={styles.centerFelt}>
          {phase === 'betting' && bet === 0 && (
            <View style={styles.betSpot}>
              <Text style={styles.placeBetText}>PLACE BET</Text>
            </View>
          )}
          {phase === 'betting' && bet > 0 && (
            <Animated.View entering={FadeIn} style={styles.betStackWrapper}>
              <ChipStack amount={bet} />
              <View style={styles.betAmountBadge}>
                <Text style={styles.betAmountText}>${bet}</Text>
              </View>
            </Animated.View>
          )}
          {phase !== 'betting' && (
            <View style={[styles.playerHandsZone, { transform: [{ scale: handsScale }] }]}>
              {hands.map((hand, index) => {
                const isCurrent = index === active && phase === 'playing';
                return (
                  <View key={hand.id} style={styles.handBlock}>
                    <View style={styles.handHeader}>
                      <View style={[styles.handTotalBadge, isCurrent && styles.handTotalBadgeActive]}>
                        <Text style={[styles.handTotalText, isCurrent && { color: '#000' }]}>
                          {handTotal(hand.cards).total}{handTotal(hand.cards).soft ? 'S' : ''}
                        </Text>
                      </View>
                      <View style={[styles.handBetBadge, isCurrent && styles.handBetBadgeActive]}>
                        <Text style={[styles.handBetBadgeText, isCurrent && { color: '#000' }]}>${hand.bet}</Text>
                      </View>
                      {phase === 'settled' && hand.outcome && (
                        <View style={[styles.outcomeBadge, getOutcomeStyle(hand.outcome)]}>
                          <Text style={styles.outcomeText}>{hand.outcome.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardRow}>
                      {hand.cards.map((card, i) => <CardView key={card.id} card={card} index={i} isShort={isShort} />)}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Settle Message Overlay */}
      {phase === 'settled' && (
         <Animated.View entering={FadeInUp.duration(300)} style={styles.messageOverlay}>
           <View style={styles.messageBadge}>
             <Text style={[styles.messageText, lastNet > 0 && { color: '#F4D03F' }]}>{message}</Text>
           </View>
         </Animated.View>
      )}

      {/* Bottom Wood/Leather Rail */}
      <View style={[styles.rail, { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'web' ? 26 : 0) }]}>
        <View style={styles.railInner}>
          <View style={styles.railStatus}>
             <TouchableOpacity testID="end-session" onPress={end} style={styles.railBtn}>
               <Feather name="log-out" size={16} color="#A0ABC0" />
             </TouchableOpacity>
             <View style={styles.bankrollDisplay}>
               <Text style={styles.bankrollLabel}>BANKROLL</Text>
               <Text style={styles.bankrollValue}>${bankroll.toLocaleString()}</Text>
             </View>
             <View style={styles.railStats}>
               <Feather name="layers" size={14} color="#A0ABC0" />
               <Text style={styles.statsValue}>{used}</Text>
             </View>
          </View>

          {phase === 'betting' ? (
             <View style={styles.controlsBetting}>
               {bankroll < 5 && !bet ? (
                  <TouchableOpacity testID="reset-bankroll" onPress={() => { setBankroll(1000); setMessage('PLACE YOUR BET'); }} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>RESET BANKROLL</Text>
                  </TouchableOpacity>
               ) : (
                  <>
                    <View style={styles.betTools}>
                       <TouchableOpacity onPress={() => setBet(0)} disabled={!bet} style={[styles.utilBtn, !bet && styles.disabled]}>
                         <Text style={styles.utilBtnText}>CLEAR</Text>
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => setBet(Math.min(lastBet, bankroll))} disabled={!lastBet || lastBet > bankroll} style={[styles.utilBtn, (!lastBet || lastBet > bankroll) && styles.disabled]}>
                         <Text style={styles.utilBtnText}>REPEAT</Text>
                       </TouchableOpacity>
                    </View>
                    <View style={styles.chipTray}>
                      {chips.map(amount => (
                        <TouchableOpacity key={amount} testID={`chip-${amount}`} disabled={bet + amount > bankroll} onPress={() => addChip(amount)} style={bet + amount > bankroll && styles.disabled}>
                          <Chip amount={amount} disabled={bet + amount > bankroll} size={46} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity testID="deal-button" disabled={!bet} onPress={deal} style={[styles.actionBtn, !bet && styles.disabled]}>
                      <Text style={styles.actionBtnText}>DEAL</Text>
                    </TouchableOpacity>
                  </>
               )}
             </View>
          ) : phase === 'insurance' ? (
             <View style={styles.controlsInsurance}>
                <Text style={styles.promptLabel}>INSURANCE?</Text>
                <View style={styles.insureRow}>
                  <TouchableOpacity testID="insurance-take" disabled={insuranceStake <= 0 || bankroll < insuranceStake} onPress={buyInsurance} style={[styles.actionBtn, { flex: 1, backgroundColor: '#F4D03F' }, (insuranceStake <= 0 || bankroll < insuranceStake) && styles.disabled]}>
                    <Text style={[styles.actionBtnText, { color: '#000' }]}>INSURE ${insuranceStake}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="insurance-decline" onPress={declineInsurance} style={[styles.actionBtn, { flex: 1, backgroundColor: '#1C2436' }]}>
                    <Text style={styles.actionBtnText}>NO INSURANCE</Text>
                  </TouchableOpacity>
                </View>
             </View>
          ) : phase === 'playing' ? (
             <View style={styles.controlsPlaying}>
                <View style={styles.playRow}>
                   <TouchableOpacity testID="action-hit" disabled={!!current?.splitAces} onPress={() => act('H')} style={[styles.actionBtn, { flex: 1, backgroundColor: '#28A745', height: 64 }, !!current?.splitAces && styles.disabled]}>
                     <Text style={styles.actionBtnText}>HIT</Text>
                   </TouchableOpacity>
                   <TouchableOpacity testID="action-stand" onPress={() => act('S')} style={[styles.actionBtn, { flex: 1, backgroundColor: '#DC3545', height: 64 }]}>
                     <Text style={styles.actionBtnText}>STAND</Text>
                   </TouchableOpacity>
                </View>
                <View style={styles.playRow}>
                   <TouchableOpacity testID="action-double" disabled={!canD} onPress={() => act('D')} style={[styles.utilBtn, { flex: 1, height: 48 }, !canD && styles.disabled]}>
                     <Text style={styles.utilBtnText}>DOUBLE</Text>
                   </TouchableOpacity>
                   <TouchableOpacity testID="action-split" disabled={!canP} onPress={() => act('P')} style={[styles.utilBtn, { flex: 1, height: 48 }, !canP && styles.disabled]}>
                     <Text style={styles.utilBtnText}>SPLIT</Text>
                   </TouchableOpacity>
                </View>
                {canR && (
                   <TouchableOpacity testID="action-surrender" onPress={() => act('R')} style={styles.surrenderBtn}>
                     <Text style={styles.surrenderText}>SURRENDER</Text>
                   </TouchableOpacity>
                )}
             </View>
          ) : phase === 'dealing' ? (
             <View style={styles.controlsDealing}>
                <Text style={styles.dealingText}>DEALING...</Text>
             </View>
          ) : (
             <View style={styles.controlsSettled}>
                <TouchableOpacity testID="next-hand" onPress={newHand} style={[styles.actionBtn, { height: 64, backgroundColor: '#4361EE' }]}>
                  <Text style={styles.actionBtnText}>NEXT HAND</Text>
                </TouchableOpacity>
             </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#136B3C' },
  tableLayout: { flex: 1, alignItems: 'center' },

  dealerEquip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 16, marginTop: 10, paddingHorizontal: 20, zIndex: 0 },
  discardTray: { width: 50, height: 70, backgroundColor: 'transparent', borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  discardStack: { width: 42, height: 62, backgroundColor: '#FFF', borderRadius: 2, opacity: 0.1 },
  chipRack: { width: 150, height: 32, backgroundColor: '#000', borderRadius: 16, flexDirection: 'row', padding: 4, gap: 3, borderWidth: 2, borderColor: '#222', marginTop: 18 },
  rackStack: { flex: 1, borderRadius: 3 },
  shoeOuter: { width: 50, height: 70, backgroundColor: '#111', borderRadius: 6, borderWidth: 2, borderColor: '#222', overflow: 'hidden' },
  shoeStack: { flex: 1, backgroundColor: '#FFF', margin: 4, borderRadius: 2, opacity: 0.8 },
  shoeWall: { position: 'absolute', right: -5, top: 0, bottom: 0, width: 10, backgroundColor: '#000', transform: [{ rotate: '15deg' }] },

  dealerCards: { minHeight: 120, alignItems: 'center', marginTop: 16, zIndex: 10 },

  feltRules: { alignItems: 'center', marginVertical: 16, opacity: 0.5 },
  markRulesBig: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#F4D03F', letterSpacing: 2, textAlign: 'center' },
  markRulesSmall: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#FFF', letterSpacing: 1, marginTop: 6, textAlign: 'center' },

  centerFelt: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', zIndex: 20, paddingBottom: 16 },
  betSpot: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  placeBetText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  betStackWrapper: { alignItems: 'center', justifyContent: 'center' },
  betAmountBadge: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  betAmountText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF' },

  playerHandsZone: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  handBlock: { alignItems: 'center' },
  cardRow: { flexDirection: 'row', justifyContent: 'center' },

  handHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, height: 24 },
  handTotalBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  handTotalBadgeActive: { backgroundColor: '#F4D03F' },
  handTotalText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFF' },
  handBetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  handBetBadgeActive: { backgroundColor: 'rgba(244, 208, 63, 0.2)' },
  handBetBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFF' },

  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeWin: { backgroundColor: '#28A745' },
  badgePush: { backgroundColor: '#6C757D' },
  badgeLoss: { backgroundColor: '#DC3545' },
  outcomeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFF', letterSpacing: 0.5 },

  messageOverlay: { position: 'absolute', top: '42%', width: '100%', alignItems: 'center', zIndex: 100 },
  messageBadge: { backgroundColor: 'rgba(0,0,0,0.9)', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  messageText: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#FFF', letterSpacing: 1 },

  rail: { backgroundColor: '#2A1610', borderTopWidth: 12, borderColor: '#1A0D09', shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 15 },
  railInner: { paddingHorizontal: 16, paddingTop: 12 },
  railStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  railBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  bankrollDisplay: { alignItems: 'center', backgroundColor: '#0A0503', paddingHorizontal: 28, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#000' },
  bankrollLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#A0ABC0', letterSpacing: 1, marginBottom: 2 },
  bankrollValue: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#F4D03F' },
  railStats: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 44, height: 44, justifyContent: 'center' },
  statsValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#A0ABC0' },

  controlsBetting: { },
  betTools: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  chipTray: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 8 },
  utilBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  utilBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#FFF', letterSpacing: 1 },

  actionBtn: { backgroundColor: '#4361EE', height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFF', letterSpacing: 1 },

  controlsInsurance: { },
  promptLabel: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF', letterSpacing: 1, textAlign: 'center', marginBottom: 16 },
  insureRow: { flexDirection: 'row', gap: 12 },

  controlsPlaying: { },
  playRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  surrenderBtn: { alignItems: 'center', paddingVertical: 8 },
  surrenderText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#A0ABC0', letterSpacing: 1 },

  controlsDealing: { minHeight: 60, justifyContent: 'center' },
  dealingText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#F4D03F', letterSpacing: 3, textAlign: 'center', marginVertical: 20 },

  controlsSettled: { },

  disabled: { opacity: 0.35 }
});