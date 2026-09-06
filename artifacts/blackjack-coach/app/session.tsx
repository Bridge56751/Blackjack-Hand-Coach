import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useCoach, Decision } from '@/lib/context';
import { getBasicStrategy, Action } from '@/lib/strategy';
import { useColors } from '@/hooks/useColors';
import { Card, GameHand, canDouble, canSplit, cardLabel, cardRankForStrategy, createShoe, dealerShouldHit, draw, handTotal, isBlackjack, settleHand } from '@/lib/game';
import { CardView } from '@/components/CardView';
import { Chip, ChipStack } from '@/components/Chip';

type Phase = 'betting' | 'playing' | 'settled';
const chips = [5, 25, 100, 250, 500];
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const buzz = (kind: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => { if (Platform.OS !== 'web') Haptics.impactAsync(kind); };
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SessionScreen() {
  const { activeSession, endSession, recordHand } = useCoach();
  const colors = useColors();
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

  const settle = (finalHands: GameHand[], initialDealer: Card[], currentShoe: Card[]) => {
    let dealerCards = initialDealer;
    const needDealer = finalHands.some(h => !h.surrendered && handTotal(h.cards).total <= 21 && !isBlackjack(h));
    if (needDealer) {
      while (dealerShouldHit(dealerCards, rules!)) {
        const next = dealDraw(dealerCards, currentShoe);
        dealerCards = next.cards;
        currentShoe = next.shoe;
      }
    }
    const resolved = finalHands.map(hand => ({ ...hand, ...settleHand(hand, dealerCards) }));
    const credit = resolved.reduce((sum, hand) => sum + settleHand(hand, dealerCards).credit, 0);
    const totalBet = resolved.reduce((sum, hand) => sum + hand.bet, 0);
    const net = credit - totalBet;
    setBankroll(value => value + credit);
    setDealer(dealerCards);
    setHands(resolved);
    setShoe(currentShoe);
    setPhase('settled');
    setLastNet(net);
    const outcome = net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Push';
    recordHand({ id: uid(), decisions: decisionsRef.current, outcome, bet: totalBet, netChange: net, dealerCards: dealerCards.map(cardLabel), playerHands: resolved.map(h => ({ cards: h.cards.map(cardLabel), bet: h.bet, outcome: h.outcome!, netChange: settleHand(h, dealerCards).credit - h.bet })) });
    setMessage(net > 0 ? `YOU WON $${net}` : net < 0 ? `DEALER WINS` : 'PUSH');
    buzz(net >= 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  };

  const advance = (updated: GameHand[], shoeNow: Card[], index: number) => {
    const next = updated.findIndex((hand, i) => i > index && !hand.surrendered && handTotal(hand.cards).total <= 21 && (!hand.splitAces || canSplit(hand, rules!, updated.length)));
    if (next >= 0) { setHands(updated); setShoe(shoeNow); setActive(next); return; }
    settle(updated, dealer, shoeNow);
  };

  const deal = () => {
    if (!rules || bet <= 0 || bet > bankroll) return;
    let fresh = shoe.length < Math.round(rules.decks * 52 * .28) ? createShoe(rules.decks) : shoe;
    let a = draw(fresh); const playerOne = a.card;
    a = draw(a.shoe); const up = a.card;
    a = draw(a.shoe); const playerTwo = a.card;
    a = draw(a.shoe); const hole = a.card;
    const hand: GameHand = { id: uid(), cards: [playerOne, playerTwo], bet, doubled: false, surrendered: false, splitAces: false, fromSplit: false };

    setBankroll(value => value - bet);
    setLastBet(bet);
    setBet(0);
    setDealer([up, hole]);
    setHands([hand]);
    setShoe(a.shoe);
    setActive(0);
    decisionsRef.current = [];
    setPhase('playing');
    setMessage('YOUR TURN');
    buzz(Haptics.ImpactFeedbackStyle.Medium);

    if (isBlackjack(hand) || handTotal([up, hole]).total === 21) {
      setTimeout(() => settle([hand], [up, hole], a.shoe), 260);
    }
  };

  const act = (action: Action) => {
    if (!current || !rules || phase !== 'playing') return;
    addDecision(action, current);
    buzz(Haptics.ImpactFeedbackStyle.Medium);

    if (action === 'H') {
      if (current.splitAces) return;
      const next = dealDraw(current.cards, shoe);
      const updated = hands.map((h, i) => i === active ? { ...h, cards: next.cards } : h);
      if (handTotal(next.cards).total > 21) advance(updated, next.shoe, active);
      else { setHands(updated); setShoe(next.shoe); }
      return;
    }

    if (action === 'S') { advance(hands, shoe, active); return; }

    if (action === 'R') {
      const updated = hands.map((h, i) => i === active ? { ...h, surrendered: true } : h);
      advance(updated, shoe, active);
      return;
    }

    if (action === 'D') {
      if (bankroll < current.bet) return;
      const next = dealDraw(current.cards, shoe);
      setBankroll(v => v - current.bet);
      const updated = hands.map((h, i) => i === active ? { ...h, cards: next.cards, bet: h.bet * 2, doubled: true } : h);
      advance(updated, next.shoe, active);
      return;
    }

    if (action === 'P') {
      if (bankroll < current.bet || !canSplit(current, rules, hands.length)) return;
      let a = draw(shoe); let b = draw(a.shoe);
      const aces = current.cards[0].rank === 'A';
      const left: GameHand = { ...current, id: uid(), cards: [current.cards[0], a.card], fromSplit: true, splitAces: aces };
      const right: GameHand = { ...current, id: uid(), cards: [current.cards[1], b.card], fromSplit: true, splitAces: aces };
      const updated = [...hands.slice(0, active), left, right, ...hands.slice(active + 1)];
      setBankroll(v => v - current.bet);
      if (aces) advance(updated, b.shoe, active - 1);
      else { setHands(updated); setShoe(b.shoe); }
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

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 8) + (Platform.OS === 'web' ? 40 : 0) }]}>

      {/* HUD Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="end-session" onPress={end} style={styles.hdrBtnLeft}>
          <Feather name="chevron-left" size={20} color="#FFFFFF" />
          <Text style={styles.hdrText}>LOBBY</Text>
        </TouchableOpacity>
        <View style={styles.hdrCenter}>
          <Text style={styles.hdrBankrollLabel}>BANKROLL</Text>
          <Text style={styles.hdrBankroll}>${bankroll.toLocaleString()}</Text>
        </View>
        <View style={styles.hdrBtnRight}>
          <Feather name="layers" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.hdrTextRight}>{used}</Text>
        </View>
      </View>

      {/* Spacious Table Area */}
      <View style={styles.tableOuter}>
        <View style={styles.tableInner}>
          <View style={styles.tableHighlight} />

          {/* Subtle curved top rail */}
          <View style={styles.arc} />

          {/* Dealer Zone */}
          <View style={[styles.dealerZone, isShort && { marginTop: 12 }]}>
            <View style={styles.handHeader}>
              <View style={[styles.handTotalBadge, { opacity: (phase === 'settled' || phase === 'playing') ? 1 : 0 }]}>
                <Text style={styles.handTotalText}>{phase === 'settled' ? handTotal(dealer).total : '?'}</Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              {dealer.map((card, i) => <CardView key={card.id} card={card} index={i} hidden={phase === 'playing' && i === 1} isShort={isShort} />)}
            </View>
          </View>

          {/* Center Felt / Bet Zone */}
          <View style={[styles.centerZone, phase === 'betting' && { minHeight: isShort ? 80 : 100 }]}>
            {phase === 'betting' ? (
              <View style={styles.betSpot}>
                {bet > 0 ? (
                  <Animated.View entering={FadeIn} style={styles.betStackWrapper}>
                    <ChipStack amount={bet} />
                    <View style={styles.betAmountBadge}>
                      <Text style={styles.betAmountText}>${bet}</Text>
                    </View>
                  </Animated.View>
                ) : (
                  <Text style={styles.placeBetText}>PLACE BET</Text>
                )}
              </View>
            ) : (
              <View style={styles.feltRules}>
                <Text style={[styles.markRules, isShort && { fontSize: 13 }]}>BLACKJACK PAYS 3 TO 2</Text>
              </View>
            )}
          </View>

          {/* Player Zone */}
          <View style={[styles.playerZone, isShort && { paddingBottom: 12 }]}>
            {phase !== 'betting' && (
              <View style={[styles.handsContainer, { transform: [{ scale: handsScale }] }]}>
                {hands.map((hand, index) => {
                  const isCurrent = index === active && phase === 'playing';
                  return (
                    <View key={hand.id} style={[styles.handBlock, isCurrent && styles.handBlockActive]}>
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
      </View>

      {/* Game Controls */}
      <View style={[styles.console, { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'web' ? 26 : 0) }]}>
        {phase === 'betting' ? (
          <View style={styles.consoleBetting}>
            {bankroll < 5 && !bet ? (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={styles.prompt}>OUT OF CHIPS</Text>
                <TouchableOpacity testID="reset-bankroll" onPress={() => { setBankroll(1000); setMessage('PLACE YOUR BET'); }} style={styles.bigActionBtn}>
                  <Text style={styles.bigActionBtnText}>RESET BANKROLL</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.bettingToolbar}>
                  <TouchableOpacity onPress={() => setBet(0)} disabled={!bet} style={[styles.toolBtn, !bet && styles.disabled]}>
                    <Text style={styles.toolBtnText}>CLEAR</Text>
                  </TouchableOpacity>
                  <Text style={styles.prompt}>{message}</Text>
                  <TouchableOpacity onPress={() => setBet(Math.min(lastBet, bankroll))} disabled={!lastBet || lastBet > bankroll} style={[styles.toolBtn, (!lastBet || lastBet > bankroll) && styles.disabled]}>
                    <Text style={styles.toolBtnText}>REPEAT</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.chipTray}>
                  {chips.map(amount => (
                    <TouchableOpacity key={amount} testID={`chip-${amount}`} disabled={bet + amount > bankroll} onPress={() => addChip(amount)} style={bet + amount > bankroll && styles.disabled}>
                      <Chip amount={amount} disabled={bet + amount > bankroll} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity testID="deal-button" disabled={!bet} onPress={deal} style={[styles.bigActionBtn, !bet && styles.disabled]}>
                  <Text style={styles.bigActionBtnText}>DEAL</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : phase === 'playing' ? (
          <View style={styles.consolePlaying}>
            <View style={styles.playMainRow}>
              <TouchableOpacity testID="action-hit" disabled={!!current?.splitAces} onPress={() => act('H')} style={[styles.playBtn, styles.btnHit, !!current?.splitAces && styles.disabled]}>
                <Text style={styles.playBtnText}>HIT</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="action-stand" onPress={() => act('S')} style={[styles.playBtn, styles.btnStand]}>
                <Text style={styles.playBtnText}>STAND</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.playSubRow}>
              <TouchableOpacity testID="action-double" disabled={!canD} onPress={() => act('D')} style={[styles.playBtnSub, !canD && styles.disabled]}>
                <Text style={styles.playBtnSubText}>DOUBLE</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="action-split" disabled={!canP} onPress={() => act('P')} style={[styles.playBtnSub, !canP && styles.disabled]}>
                <Text style={styles.playBtnSubText}>SPLIT</Text>
              </TouchableOpacity>
            </View>
            {canR && (
               <TouchableOpacity testID="action-surrender" onPress={() => act('R')} style={styles.surrenderBtn}>
                 <Text style={styles.surrenderText}>SURRENDER</Text>
               </TouchableOpacity>
            )}
          </View>
        ) : (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.consoleSettled}>
            <View style={styles.settleBanner}>
              <Text style={[styles.settleMessage, lastNet > 0 && { color: '#F4D03F' }]}>{message}</Text>
            </View>
            <TouchableOpacity testID="next-hand" onPress={newHand} style={styles.bigActionBtn}>
              <Text style={styles.bigActionBtnText}>NEXT HAND</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0F19' },
  header: { height: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  hdrBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 80, justifyContent: 'flex-start' },
  hdrBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80, justifyContent: 'flex-end' },
  hdrText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFF' },
  hdrTextRight: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  hdrCenter: { alignItems: 'center' },
  hdrBankrollLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 2 },
  hdrBankroll: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#FFF' },

  tableOuter: { flex: 1, backgroundColor: '#138A43', borderRadius: 24, marginHorizontal: 12, overflow: 'hidden' },
  tableInner: { flex: 1, alignItems: 'center', position: 'relative' },
  tableHighlight: { position: 'absolute', top: -100, width: 600, height: 600, borderRadius: 300, backgroundColor: 'rgba(255,255,255,0.1)', opacity: 0.8 },
  arc: { position: 'absolute', width: 800, height: 800, borderRadius: 400, borderWidth: 8, borderColor: 'rgba(0,0,0,0.1)', top: -750 },

  dealerZone: { marginTop: 20, alignItems: 'center', zIndex: 10 },
  centerZone: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  playerZone: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, zIndex: 20 },

  feltRules: { alignItems: 'center', opacity: 0.6 },
  markRules: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFF', letterSpacing: 2 },

  betSpot: { alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.1)' },
  placeBetText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  betStackWrapper: { alignItems: 'center' },
  betAmountBadge: { backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  betAmountText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF' },

  handsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  handBlock: { alignItems: 'center', padding: 8, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  handBlockActive: { borderColor: '#F4D03F', backgroundColor: 'rgba(0,0,0,0.2)' },

  handHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8, height: 24, gap: 6 },
  handTotalBadge: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  handTotalBadgeActive: { backgroundColor: '#F4D03F' },
  handTotalText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF' },
  handBetBadge: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  handBetBadgeActive: { backgroundColor: '#F4D03F' },
  handBetBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFF' },
  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeWin: { backgroundColor: '#28A745' },
  badgePush: { backgroundColor: '#6C757D' },
  badgeLoss: { backgroundColor: '#DC3545' },
  outcomeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFF', letterSpacing: 0.5 },

  cardRow: { flexDirection: 'row', justifyContent: 'center' },

  console: { paddingHorizontal: 16, paddingTop: 16, minHeight: 200, backgroundColor: '#0B0F19' },
  prompt: { fontFamily: 'Inter_700Bold', fontSize: 14, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textAlign: 'center' },

  consoleBetting: { flex: 1, justifyContent: 'space-between' },
  bettingToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toolBtn: { backgroundColor: '#1C2436', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  toolBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#A0ABC0' },
  chipTray: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 20 },

  consolePlaying: { flex: 1 },
  playMainRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  playBtn: { flex: 1, height: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnHit: { backgroundColor: '#28A745' },
  btnStand: { backgroundColor: '#DC3545' },
  playBtnText: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#FFF', letterSpacing: 1 },

  playSubRow: { flexDirection: 'row', gap: 12 },
  playBtnSub: { flex: 1, height: 56, borderRadius: 12, backgroundColor: '#1C2436', alignItems: 'center', justifyContent: 'center' },
  playBtnSubText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFF', letterSpacing: 0.5 },
  surrenderBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  surrenderText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#A0ABC0', letterSpacing: 1 },

  consoleSettled: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24, width: '100%' },
  settleBanner: { alignItems: 'center' },
  settleMessage: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#FFF', letterSpacing: 1, textAlign: 'center' },

  bigActionBtn: { height: 64, width: '100%', backgroundColor: '#4361EE', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bigActionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#FFF', letterSpacing: 1 },

  disabled: { opacity: 0.35 }
});