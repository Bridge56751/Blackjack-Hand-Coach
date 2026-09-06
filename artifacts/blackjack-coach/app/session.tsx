import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useCoach, Decision } from '@/lib/context';
import { getBasicStrategy, Action } from '@/lib/strategy';
import { Card, GameHand, canDouble, canSplit, cardLabel, cardRankForStrategy, createShoe, dealerShouldHit, draw, handTotal, isBlackjack, settleHand, settleInsurance } from '@/lib/game';
import { CardView } from '@/components/CardView';
import { Chip, ChipStack } from '@/components/Chip';

type Phase = 'betting' | 'dealing' | 'insurance' | 'playing' | 'settled';
const chips = [5, 25, 100, 250, 500];
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const buzz = (kind: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => { if (Platform.OS !== 'web') Haptics.impactAsync(kind); };
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TABLE_W = SCREEN_WIDTH * 2.2;
const TABLE_H = SCREEN_HEIGHT * 1.2;

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
  const handsScale = hands.length > 2 ? 0.75 : hands.length > 1 ? 0.85 : 1;
  const insuranceStake = hands[0]?.bet ? hands[0].bet / 2 : 0;

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 8) + (Platform.OS === 'web' ? 40 : 0) }]}>

      {/* Casino Dark Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#05080A', '#020304']} style={StyleSheet.absoluteFill} />
      </View>

      {/* 3D Table Surface */}
      <View style={styles.tableShape}>
         {/* Wood Rail Edge */}
         <View style={styles.tableWood}>
            {/* Leather Pad */}
            <View style={styles.tableLeather}>
               {/* Felt Surface */}
                <LinearGradient colors={['#1F6A38', '#0D381A']} style={styles.felt}>

                  {/* Subtle highlight spotlight */}
                  <View style={styles.spotlight} />

                  {/* Dealer Equipment */}
                  <View style={styles.dealerEquip}>
                    <View style={styles.discardTray}>
                      <View style={styles.discardStack} />
                      <View style={styles.discardGlass} />
                    </View>
                    <View style={styles.chipRack}>
                       <LinearGradient colors={['#111', '#000']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
                       <View style={[styles.rackStack, { backgroundColor: '#D92534' }]} />
                       <View style={[styles.rackStack, { backgroundColor: '#28A745' }]} />
                       <View style={[styles.rackStack, { backgroundColor: '#0A0A0C' }]} />
                       <View style={[styles.rackStack, { backgroundColor: '#102272' }]} />
                       <View style={[styles.rackStack, { backgroundColor: '#463952' }]} />
                    </View>
                    <View style={styles.shoeOuter}>
                      <View style={styles.shoeStack} />
                      <LinearGradient colors={['#222', '#050505']} style={styles.shoeWall} />
                    </View>
                  </View>

                  {/* Dealer Cards */}
                  <View style={[styles.dealerCards, isShort && { minHeight: 90 }]}>
                    <View style={styles.handHeader}>
                      <View style={[styles.handTotalBadge, { opacity: (phase === 'settled' || phase === 'playing') ? 1 : 0 }]}>
                        <Text style={styles.handTotalText}>{phase === 'settled' ? handTotal(dealer).total : '?'}</Text>
                      </View>
                    </View>
                    <View style={styles.cardRow}>
                      {dealer.map((card, i) => <CardView key={card.id} card={card} index={i} hidden={i === 1 && (phase === 'playing' || phase === 'dealing' || phase === 'insurance')} isShort={isShort} isDealer />)}
                    </View>
                  </View>

                  {/* Table Rules Typography */}
                  <View style={[styles.feltRules, isShort && { marginVertical: 4 }]}>
                    <Text style={[styles.markRulesBig, isShort && { fontSize: 14 }]}>BLACKJACK PAYS 3 TO 2</Text>
                    <Text style={[styles.markRulesSmall, isShort && { fontSize: 9 }]}>{rules?.dealerHitsSoft17 ? 'DEALER MUST HIT SOFT 17' : 'DEALER STANDS ON ALL 17'}</Text>
                    <Text style={[styles.markRulesSmall, isShort && { fontSize: 9 }]}>INSURANCE PAYS 2 TO 1</Text>
                  </View>

                  {/* Center Felt - Betting & Player Cards */}
                  <View style={[styles.centerFelt, { paddingBottom: isShort ? 340 : 250 }]}>
                    {phase === 'betting' && bet === 0 && (
                      <View style={styles.betSpot}>
                        <Text style={styles.placeBetText}>PLACE BET</Text>
                      </View>
                    )}
                    {phase === 'betting' && bet > 0 && (
                      <Animated.View entering={FadeIn} style={styles.betStackWrapper}>
                        <View style={styles.betSpotOuter}>
                          <ChipStack amount={bet} />
                        </View>
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

               </LinearGradient>
            </View>
         </View>
      </View>

      {/* Settle Message Overlay */}
      {phase === 'settled' && (
         <Animated.View entering={FadeInUp.duration(300)} style={styles.messageOverlay}>
           <LinearGradient colors={['rgba(20,20,20,0.95)', 'rgba(5,5,5,0.98)']} style={styles.messageBadge}>
             <Text style={[styles.messageText, lastNet > 0 && { color: '#F4D03F' }]}>{message}</Text>
             {lastNet > 0 && <Text style={styles.messageSubText}>+${lastNet}</Text>}
           </LinearGradient>
         </Animated.View>
      )}

      {/* Bottom Rail / Dashboard Overlay */}
      <View style={[styles.controlsOverlay, {
        paddingBottom: Math.max(insets.bottom, isShort ? 8 : 16) + (Platform.OS === 'web' ? 26 : 0),
      }]}>
         <LinearGradient colors={['rgba(26,13,7,0.95)', 'rgba(15,7,3,0.98)']} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]} />
         <View style={styles.railBorder} />

         <View style={styles.railInner}>
           <View style={styles.railStatus}>
              <TouchableOpacity testID="end-session" onPress={end} style={styles.railBtn}>
                <Feather name="log-out" size={18} color="#A0ABC0" />
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
                   <TouchableOpacity testID="reset-bankroll" onPress={() => { setBankroll(1000); setMessage('PLACE YOUR BET'); }} style={[styles.actionBtn, styles.btnPrimary]}>
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
                     <TouchableOpacity testID="deal-button" disabled={!bet} onPress={deal} style={[styles.actionBtn, styles.btnPrimary, !bet && styles.disabled]}>
                       <Text style={styles.actionBtnText}>DEAL</Text>
                     </TouchableOpacity>
                   </>
                )}
              </View>
           ) : phase === 'insurance' ? (
              <View style={styles.controlsInsurance}>
                 <Text style={styles.promptLabel}>INSURANCE?</Text>
                 <View style={styles.insureRow}>
                   <TouchableOpacity testID="insurance-take" disabled={insuranceStake <= 0 || bankroll < insuranceStake} onPress={buyInsurance} style={[styles.actionBtn, styles.btnInsure, { flex: 1 }, (insuranceStake <= 0 || bankroll < insuranceStake) && styles.disabled]}>
                     <Text style={[styles.actionBtnText, { color: '#000', textShadowColor: 'transparent' }]}>INSURE ${insuranceStake}</Text>
                   </TouchableOpacity>
                   <TouchableOpacity testID="insurance-decline" onPress={declineInsurance} style={[styles.actionBtn, styles.btnNeutral, { flex: 1 }]}>
                     <Text style={styles.actionBtnText}>NO INSURANCE</Text>
                   </TouchableOpacity>
                 </View>
              </View>
           ) : phase === 'playing' ? (
              <View style={styles.controlsPlaying}>
                 <View style={styles.playRow}>
                    <TouchableOpacity testID="action-hit" disabled={!!current?.splitAces} onPress={() => act('H')} style={[styles.actionBtn, styles.btnHit, { flex: 1 }, !!current?.splitAces && styles.disabled]}>
                      <Text style={styles.actionBtnText}>HIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="action-stand" onPress={() => act('S')} style={[styles.actionBtn, styles.btnStand, { flex: 1 }]}>
                      <Text style={styles.actionBtnText}>STAND</Text>
                    </TouchableOpacity>
                 </View>
                 <View style={styles.playRow}>
                    <TouchableOpacity testID="action-double" disabled={!canD} onPress={() => act('D')} style={[styles.actionBtn, styles.btnDouble, { flex: 1, height: 50 }, !canD && styles.disabled]}>
                      <Text style={[styles.actionBtnText, { fontSize: 13 }]}>DOUBLE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="action-split" disabled={!canP} onPress={() => act('P')} style={[styles.actionBtn, styles.btnSplit, { flex: 1, height: 50 }, !canP && styles.disabled]}>
                      <Text style={[styles.actionBtnText, { fontSize: 13 }]}>SPLIT</Text>
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
                 <TouchableOpacity testID="next-hand" onPress={newHand} style={[styles.actionBtn, styles.btnPrimary]}>
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
  page: { flex: 1, backgroundColor: '#000' },

  tableShape: {
    position: 'absolute',
    top: Math.max(SCREEN_HEIGHT * 0.03, 30),
    left: -(TABLE_W - SCREEN_WIDTH) / 2,
    width: TABLE_W,
    height: TABLE_H,
    zIndex: 1,
  },
  tableWood: {
    flex: 1,
    borderTopLeftRadius: TABLE_W / 2,
    borderTopRightRadius: TABLE_W / 2,
    backgroundColor: '#381C0F',
    paddingTop: 14,
    borderWidth: 3,
    borderColor: '#1C0D06',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20,
  },
  tableLeather: {
    flex: 1,
    borderTopLeftRadius: TABLE_W / 2,
    borderTopRightRadius: TABLE_W / 2,
    backgroundColor: '#171717',
    paddingTop: 20,
    borderWidth: 2,
    borderColor: '#0A0A0A',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.9, shadowRadius: 15,
  },
  felt: {
    flex: 1,
    borderTopLeftRadius: TABLE_W / 2,
    borderTopRightRadius: TABLE_W / 2,
    alignItems: 'center',
    paddingHorizontal: (TABLE_W - SCREEN_WIDTH) / 2,
    overflow: 'hidden'
  },
  spotlight: {
    position: 'absolute',
    top: -100,
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: SCREEN_WIDTH,
    transform: [{ scaleY: 0.5 }],
    alignSelf: 'center',
  },

  dealerEquip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 24, marginTop: 15, paddingHorizontal: 20, zIndex: 0 },

  discardTray: {
    width: 55, height: 75,
    backgroundColor: 'rgba(10,10,10,0.6)',
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ perspective: 300 }, { rotateY: '15deg' }, { rotateZ: '5deg' }],
    shadowColor: '#000', shadowOffset: { width: -4, height: 6 }, shadowOpacity: 0.5, shadowRadius: 5
  },
  discardStack: { width: 45, height: 65, backgroundColor: '#FFF', borderRadius: 3, opacity: 0.15 },
  discardGlass: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 },

  chipRack: {
    width: 160, height: 34,
    borderRadius: 16, flexDirection: 'row', padding: 5, gap: 4,
    borderWidth: 1, borderColor: '#333', marginTop: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.6, shadowRadius: 6
  },
  rackStack: { flex: 1, borderRadius: 2 },

  shoeOuter: {
    width: 55, height: 75,
    backgroundColor: '#0F0F0F', borderRadius: 6, borderWidth: 1, borderColor: '#2A2A2A',
    overflow: 'hidden',
    transform: [{ perspective: 300 }, { rotateY: '-15deg' }, { rotateZ: '-5deg' }],
    shadowColor: '#000', shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.6, shadowRadius: 5
  },
  shoeStack: { flex: 1, backgroundColor: '#FFF', margin: 4, borderRadius: 3, opacity: 0.9 },
  shoeWall: { position: 'absolute', right: -6, top: -5, bottom: -5, width: 14, transform: [{ rotate: '15deg' }] },

  dealerCards: { minHeight: 125, alignItems: 'center', marginTop: 15, zIndex: 10 },

  feltRules: { alignItems: 'center', marginVertical: 12, opacity: 0.45 },
  markRulesBig: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#F4D03F', letterSpacing: 2.5, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width:0, height:1}, textShadowRadius: 2 },
  markRulesSmall: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#FFF', letterSpacing: 1.5, marginTop: 4, textAlign: 'center' },

  centerFelt: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', zIndex: 20 },

  betSpot: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderBottomColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center', justifyContent: 'center'
  },
  placeBetText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 },
  betStackWrapper: { alignItems: 'center', justifyContent: 'center' },
  betSpotOuter: {
     width: 80, height: 80, borderRadius: 40,
     borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
     alignItems: 'center', justifyContent: 'center'
  },
  betAmountBadge: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  betAmountText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#F4D03F' },

  playerHandsZone: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  handBlock: { alignItems: 'center' },
  cardRow: { flexDirection: 'row', justifyContent: 'center' },

  handHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, height: 24 },
  handTotalBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  handTotalBadgeActive: { backgroundColor: '#F4D03F', borderColor: '#F4D03F' },
  handTotalText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFF' },
  handBetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  handBetBadgeActive: { backgroundColor: 'rgba(244, 208, 63, 0.2)', borderColor: 'rgba(244, 208, 63, 0.4)' },
  handBetBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFF' },

  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeWin: { backgroundColor: '#28A745' },
  badgePush: { backgroundColor: '#6C757D' },
  badgeLoss: { backgroundColor: '#DC3545' },
  outcomeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFF', letterSpacing: 0.5 },

  messageOverlay: { position: 'absolute', top: '38%', width: '100%', alignItems: 'center', zIndex: 100 },
  messageBadge: { paddingHorizontal: 32, paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: '#333', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 15, elevation: 10, alignItems: 'center' },
  messageText: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFF', letterSpacing: 1.5, textAlign: 'center' },
  messageSubText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#28A745', marginTop: 4 },

  controlsOverlay: { position: 'absolute', bottom: 0, width: '100%', zIndex: 50, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 20 },
  railBorder: { position: 'absolute', top: 0, width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  railInner: { paddingHorizontal: 16, paddingTop: 10 },

  railStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  railBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bankrollDisplay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 32, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bankrollLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#A0ABC0', letterSpacing: 1.5, marginBottom: 2 },
  bankrollValue: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#F4D03F', textShadowColor: 'rgba(244,208,63,0.3)', textShadowOffset: {width:0, height:0}, textShadowRadius: 8 },
  railStats: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 44, height: 44, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statsValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#A0ABC0' },

  controlsBetting: { },
  betTools: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  chipTray: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 8 },
  utilBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  utilBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#FFF', letterSpacing: 1 },

  actionBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 6 },
  actionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFF', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width:0,height:1}, textShadowRadius: 2 },

  btnPrimary: { backgroundColor: '#1C39BB', borderTopWidth: 1, borderColor: '#3A57DF' },
  btnHit: { backgroundColor: '#1E8449', borderTopWidth: 1, borderColor: '#2EAC62' },
  btnStand: { backgroundColor: '#C0392B', borderTopWidth: 1, borderColor: '#E05344' },
  btnDouble: { backgroundColor: '#2980B9', borderTopWidth: 1, borderColor: '#409EDD' },
  btnSplit: { backgroundColor: '#8E44AD', borderTopWidth: 1, borderColor: '#A85CCB' },
  btnInsure: { backgroundColor: '#D4AC0D', borderTopWidth: 1, borderColor: '#F1C40F' },
  btnNeutral: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  disabled: { opacity: 0.4 },

  controlsInsurance: { },
  promptLabel: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF', textAlign: 'center', marginBottom: 10, letterSpacing: 2 },
  insureRow: { flexDirection: 'row', gap: 12 },

  controlsPlaying: { },
  playRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  surrenderBtn: { paddingVertical: 8, alignItems: 'center' },
  surrenderText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#A0ABC0', letterSpacing: 1 },

  controlsDealing: { alignItems: 'center', justifyContent: 'center', height: 52 },
  dealingText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 },

  controlsSettled: { },
});