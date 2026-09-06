import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useCoach, Decision } from '@/lib/context';
import { getBasicStrategy, Action } from '@/lib/strategy';
import { useColors } from '@/hooks/useColors';
import { Card, GameHand, canDouble, canSplit, cardLabel, cardRankForStrategy, createShoe, dealerShouldHit, draw, handTotal, isBlackjack, settleHand } from '@/lib/game';
import { CardView } from '@/components/CardView';
import { Chip, ChipStack } from '@/components/Chip';

type Phase = 'betting' | 'playing' | 'settled';
const chips = [5, 25, 100, 500];
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const buzz = (kind: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => { if (Platform.OS !== 'web') Haptics.impactAsync(kind); };
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SessionScreen() {
  const { activeSession, endSession, recordHand } = useCoach();
  const colors = useColors(); const router = useRouter(); const insets = useSafeAreaInsets();
  const rules = activeSession?.rules;
  const [bankroll, setBankroll] = useState(1000); const [bet, setBet] = useState(0); const [lastBet, setLastBet] = useState(25);
  const [shoe, setShoe] = useState<Card[]>(() => createShoe(rules?.decks ?? 6));
  const [dealer, setDealer] = useState<Card[]>([]); const [hands, setHands] = useState<GameHand[]>([]);
  const [active, setActive] = useState(0); const [phase, setPhase] = useState<Phase>('betting');
  const [lastNet, setLastNet] = useState(0);
  const decisionsRef = useRef<Decision[]>([]);
  const endingRef = useRef(false);
  const [message, setMessage] = useState('PLACE YOUR WAGER');
  useEffect(() => { if (!activeSession && !endingRef.current) router.replace('/'); }, [activeSession, router]);
  const current = hands[active];
  const used = (rules?.decks ?? 6) * 52 - shoe.length;

  const dealDraw = (cards: Card[], currentShoe: Card[]) => { const next = draw(currentShoe); return { cards: [...cards, next.card], shoe: next.shoe }; };
  const addDecision = (action: Action, hand: GameHand) => {
    if (!rules || !dealer[0]) return;
    const cards = hand.cards.map(cardRankForStrategy); const up = cardRankForStrategy(dealer[0]);
    const correct = getBasicStrategy(cards, up, rules);
    const entry = { id: uid(), playerCards: cards, dealerCard: up, chosen: action, correct, isCorrect: correct === action };
    decisionsRef.current = [...decisionsRef.current, entry];
  };
  const settle = (finalHands: GameHand[], initialDealer: Card[], currentShoe: Card[]) => {
    let dealerCards = initialDealer;
    const needDealer = finalHands.some(h => !h.surrendered && handTotal(h.cards).total <= 21 && !isBlackjack(h));
    if (needDealer) while (dealerShouldHit(dealerCards, rules!)) { const next = dealDraw(dealerCards, currentShoe); dealerCards = next.cards; currentShoe = next.shoe; }
    const resolved = finalHands.map(hand => ({ ...hand, ...settleHand(hand, dealerCards) }));
    const credit = resolved.reduce((sum, hand) => sum + settleHand(hand, dealerCards).credit, 0);
    const totalBet = resolved.reduce((sum, hand) => sum + hand.bet, 0);
    const net = credit - totalBet;
    setBankroll(value => value + credit); setDealer(dealerCards); setHands(resolved); setShoe(currentShoe); setPhase('settled');
    setLastNet(net);
    const outcome = net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Push';
    recordHand({ id: uid(), decisions: decisionsRef.current, outcome, bet: totalBet, netChange: net, dealerCards: dealerCards.map(cardLabel), playerHands: resolved.map(h => ({ cards: h.cards.map(cardLabel), bet: h.bet, outcome: h.outcome!, netChange: settleHand(h, dealerCards).credit - h.bet })) });
    setMessage(net > 0 ? `YOU COLLECT +$${credit - totalBet}` : net < 0 ? `DEALER TAKES $${Math.abs(net)}` : 'WAGER RETURNED');
    buzz(net >= 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  };
  const advance = (updated: GameHand[], shoeNow: Card[], index: number) => {
    const next = updated.findIndex((hand, i) => i > index && !hand.surrendered && handTotal(hand.cards).total <= 21 && (!hand.splitAces || canSplit(hand, rules!, updated.length)));
    if (next >= 0) { setHands(updated); setShoe(shoeNow); setActive(next); return; }
    settle(updated, dealer, shoeNow);
  };
  const deal = () => {
    if (!rules || bet <= 0 || bet > bankroll) return;
    let fresh = shoe.length < Math.round(rules.decks * 52 * .28) ? createShoe(rules.decks) : shoe;
    let a = draw(fresh); const playerOne = a.card; a = draw(a.shoe); const up = a.card; a = draw(a.shoe); const playerTwo = a.card; a = draw(a.shoe); const hole = a.card;
    const hand: GameHand = { id: uid(), cards: [playerOne, playerTwo], bet, doubled: false, surrendered: false, splitAces: false, fromSplit: false };
    setBankroll(value => value - bet); setLastBet(bet); setBet(0); setDealer([up, hole]); setHands([hand]); setShoe(a.shoe); setActive(0); decisionsRef.current = []; setPhase('playing'); setMessage('YOUR MOVE');
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    if (isBlackjack(hand) || handTotal([up, hole]).total === 21) setTimeout(() => settle([hand], [up, hole], a.shoe), 260);
  };
  const act = (action: Action) => {
    if (!current || !rules || phase !== 'playing') return;
    addDecision(action, current); buzz(Haptics.ImpactFeedbackStyle.Medium);
    if (action === 'H') { if (current.splitAces) return; const next = dealDraw(current.cards, shoe); const updated = hands.map((h, i) => i === active ? { ...h, cards: next.cards } : h); if (handTotal(next.cards).total > 21) advance(updated, next.shoe, active); else { setHands(updated); setShoe(next.shoe); } return; }
    if (action === 'S') { advance(hands, shoe, active); return; }
    if (action === 'R') { const updated = hands.map((h, i) => i === active ? { ...h, surrendered: true } : h); advance(updated, shoe, active); return; }
    if (action === 'D') { if (bankroll < current.bet) return; const next = dealDraw(current.cards, shoe); setBankroll(v => v - current.bet); const updated = hands.map((h, i) => i === active ? { ...h, cards: next.cards, bet: h.bet * 2, doubled: true } : h); advance(updated, next.shoe, active); return; }
    if (action === 'P') {
      if (bankroll < current.bet || !canSplit(current, rules, hands.length)) return;
      let a = draw(shoe); let b = draw(a.shoe); const aces = current.cards[0].rank === 'A';
      const left: GameHand = { ...current, id: uid(), cards: [current.cards[0], a.card], fromSplit: true, splitAces: aces };
      const right: GameHand = { ...current, id: uid(), cards: [current.cards[1], b.card], fromSplit: true, splitAces: aces };
      const updated = [...hands.slice(0, active), left, right, ...hands.slice(active + 1)]; setBankroll(v => v - current.bet);
      if (aces) advance(updated, b.shoe, active - 1); else { setHands(updated); setShoe(b.shoe); }
    }
  };
  const newHand = () => { setDealer([]); setHands([]); decisionsRef.current = []; setActive(0); setPhase('betting'); setMessage(bankroll >= 5 ? 'PLACE YOUR WAGER' : 'YOUR STAKE IS EMPTY'); };
  const addChip = (amount: number) => { if (phase === 'betting' && bet + amount <= bankroll) { setBet(v => v + amount); buzz(); } };
  const end = () => {
    endingRef.current = true;
    const id = endSession(bankroll);
    if (id) router.replace(`/report/${id}`);
    else router.replace('/');
  };

  if (!activeSession || !rules) return null;
  const canD = current && bankroll >= current.bet && canDouble(current, rules);
  const canP = current && bankroll >= current.bet && canSplit(current, rules, hands.length);
  const canR = current && current.cards.length === 2 && !current.fromSplit && rules.surrender === 'late';
  const handsScale = hands.length > 2 ? 0.8 : hands.length > 1 ? 0.9 : 1;

  const getOutcomeStyle = (outcome?: string) => {
    if (outcome === 'Win' || outcome === 'Blackjack') return styles.badgeWin;
    if (outcome === 'Push') return styles.badgePush;
    return styles.badgeLoss;
  };

  const isCompact = SCREEN_HEIGHT < 800;

  return (
    <View style={[styles.page, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) + (Platform.OS === 'web' ? 50 : 0) }]}>

      {/* HUD Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="end-session" onPress={end} style={styles.hdrBtnLeft}>
          <Feather name="log-out" size={12} color={colors.mutedForeground} />
          <Text style={[styles.hdrText, { color: colors.mutedForeground }]}>EXIT</Text>
        </TouchableOpacity>
        <View style={styles.hdrCenter}>
          <Text style={[styles.hdrBankrollLabel, { color: colors.mutedForeground }]}>BANKROLL</Text>
          <Text style={styles.hdrBankroll}>${bankroll}</Text>
        </View>
        <View style={styles.hdrBtnRight}>
          <Feather name="layers" size={12} color={colors.mutedForeground} />
          <Text style={[styles.hdrText, { color: colors.mutedForeground }]}>{used} DEALT</Text>
        </View>
      </View>

      {/* Table Area */}
      <View style={styles.tableOuter}>
        <View style={styles.tableInner}>
          <View style={styles.feltLight} />
          <View style={styles.arc} />

          {/* Dealer Zone */}
          <View style={styles.dealerZone}>
            <View style={styles.handHeader}>
              <View style={[styles.handTotalBadge, { opacity: (phase === 'settled' || phase === 'playing') ? 1 : 0 }]}>
                <Text style={styles.handTotalText}>{phase === 'settled' ? handTotal(dealer).total : '?'}</Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              {dealer.map((card, i) => <CardView key={card.id} card={card} index={i} hidden={phase === 'playing' && i === 1} />)}
            </View>
          </View>

          {/* Center Felt Markings */}
          <View style={[styles.centerMark, isCompact && { marginTop: 10, flex: 0.5 }]}>
            <Text style={styles.markRules}>BLACKJACK PAYS 3 TO 2</Text>
            <Text style={styles.markSubRules}>{rules?.dealerHitsSoft17 ? 'DEALER MUST HIT SOFT 17' : 'DEALER STANDS ON ALL 17s'}</Text>
            <Text style={styles.markSubRules}>INSURANCE PAYS 2 TO 1</Text>
          </View>

          {/* Player Zone */}
          <View style={styles.playerZone}>
            {phase === 'betting' ? (
              <View style={styles.betSpot}>
                <View style={styles.betRing}>
                  {bet > 0 ? (
                    <View style={styles.betStack}>
                      <ChipStack amount={bet} />
                      <View style={styles.betAmountBadge}>
                        <Text style={styles.betAmountText}>${bet}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.placeBetText}>PLACE BET</Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={[styles.handsContainer, { transform: [{ scale: handsScale }] }]}>
                {hands.map((hand, index) => (
                  <View key={hand.id} style={[styles.handBlock, index === active && phase === 'playing' && styles.handBlockActive]}>
                    <View style={styles.handHeader}>
                      <View style={styles.handTotalBadge}>
                        <Text style={styles.handTotalText}>{handTotal(hand.cards).total}{handTotal(hand.cards).soft ? 'S' : ''}</Text>
                      </View>
                      {phase === 'settled' && (
                        <View style={[styles.outcomeBadge, getOutcomeStyle(hand.outcome)]}>
                          <Text style={styles.outcomeText}>{hand.outcome?.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardRow}>
                      {hand.cards.map((card, i) => <CardView key={card.id} card={card} index={i} />)}
                    </View>
                    <View style={styles.handBetRow}>
                      <Chip amount={hand.bet} size={18} style={{ shadowOpacity: 0, elevation: 0 }} />
                      <Text style={styles.handBetText}>${hand.bet}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Controls Console */}
      <View style={[styles.console, { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'web' ? 26 : 0) }]}>
        {phase === 'betting' ? (
          <View style={styles.consoleBetting}>
            {bankroll < 5 && !bet ? (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={styles.prompt}>YOUR PRACTICE STAKE IS EMPTY</Text>
                <TouchableOpacity testID="reset-bankroll" onPress={() => { setBankroll(1000); setMessage('FRESH STAKE LOADED'); }} style={styles.goldBtn}>
                  <Text style={styles.goldBtnText}>RESET BANKROLL</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.pillRow}>
                  <Text style={styles.prompt}>{message}</Text>
                  <View style={{flexDirection: 'row', gap: 6}}>
                    <TouchableOpacity onPress={() => setBet(0)} disabled={!bet} style={[styles.pillBtn, !bet && styles.disabled]}>
                      <Text style={styles.pillText}>CLEAR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setBet(Math.min(lastBet, bankroll))} disabled={!lastBet || lastBet > bankroll} style={[styles.pillBtn, (!lastBet || lastBet > bankroll) && styles.disabled]}>
                      <Text style={styles.pillText}>REPEAT</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.chipTray}>
                  {chips.map(amount => (
                    <TouchableOpacity key={amount} testID={`chip-${amount}`} disabled={bet + amount > bankroll} onPress={() => addChip(amount)} style={bet + amount > bankroll && styles.disabled}>
                      <Chip amount={amount} disabled={bet + amount > bankroll} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity testID="deal-button" disabled={!bet} onPress={deal} style={[styles.goldBtn, !bet && styles.disabled]}>
                  <Text style={styles.goldBtnText}>DEAL</Text>
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
          <Animated.View entering={FadeInUp.duration(280)} style={styles.consoleSettled}>
            <View style={styles.settleBanner}>
              <View style={[styles.premiumBadge, lastNet > 0 ? styles.badgeWin : lastNet < 0 ? styles.badgeLoss : styles.badgePush]}>
                <Text style={styles.premiumBadgeText}>{lastNet > 0 ? 'WINNER' : lastNet < 0 ? 'DEALER WINS' : 'PUSH'}</Text>
              </View>
              <Text style={styles.settleMessage}>{message}</Text>
            </View>
            <TouchableOpacity testID="next-hand" onPress={newHand} style={styles.goldBtn}>
              <Text style={styles.goldBtnText}>NEXT HAND</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { height: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  hdrBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80, justifyContent: 'flex-start' },
  hdrBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80, justifyContent: 'flex-end' },
  hdrText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  hdrCenter: { alignItems: 'center' },
  hdrBankrollLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.5, marginBottom: 2 },
  hdrBankroll: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#D4AF37' },

  tableOuter: { flex: 1, backgroundColor: '#301B0F', borderRadius: 36, marginHorizontal: 8, padding: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  tableInner: { flex: 1, backgroundColor: '#0A2E1C', borderRadius: 30, overflow: 'hidden', borderWidth: 1.5, borderColor: '#D4AF37', alignItems: 'center' },
  feltLight: { position: 'absolute', top: -100, width: 600, height: 600, borderRadius: 300, backgroundColor: 'rgba(255,255,255,0.02)' },
  arc: { position: 'absolute', width: 600, height: 600, borderRadius: 300, borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.25)', top: 120 },

  dealerZone: { marginTop: 24, alignItems: 'center', minHeight: 120 },
  centerMark: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60 },
  playerZone: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, minHeight: 160 },

  markRules: { fontFamily: 'Inter_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 6 },
  markSubRules: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 2 },

  betSpot: { alignItems: 'center', justifyContent: 'center', height: 120 },
  betRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: 'rgba(212, 175, 55, 0.4)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  placeBetText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
  betStack: { alignItems: 'center', justifyContent: 'center' },
  betAmountBadge: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: '#D4AF37' },
  betAmountText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#D4AF37' },

  handsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  handBlock: { alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  handBlockActive: { borderColor: 'rgba(212, 175, 55, 0.4)', backgroundColor: 'rgba(212, 175, 55, 0.05)' },
  handHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 8, height: 20 },
  handTotalBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  handTotalText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#FFF' },
  outcomeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeWin: { backgroundColor: '#2A9D8F' },
  badgePush: { backgroundColor: '#457B9D' },
  badgeLoss: { backgroundColor: '#E63946' },
  outcomeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFF', letterSpacing: 0.5 },

  cardRow: { flexDirection: 'row', justifyContent: 'center' },
  handBetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  handBetText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#FFF' },

  console: { paddingHorizontal: 16, paddingTop: 16, minHeight: 180 },
  prompt: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textAlign: 'center' },

  consoleBetting: { flex: 1, justifyContent: 'space-between' },
  pillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  pillBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFF', letterSpacing: 1 },
  chipTray: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 16 },

  consolePlaying: { flex: 1 },
  playMainRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  playBtn: { flex: 1, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: {width: 0, height: 3}, shadowRadius: 4, elevation: 4 },
  btnHit: { backgroundColor: '#2A9D8F' },
  btnStand: { backgroundColor: '#E63946' },
  playBtnText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#FFF', letterSpacing: 1 },

  playSubRow: { flexDirection: 'row', gap: 12 },
  playBtnSub: { flex: 1, height: 48, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  playBtnSubText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFF', letterSpacing: 0.5 },
  surrenderBtn: { marginTop: 16, alignItems: 'center' },
  surrenderText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },

  consoleSettled: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, width: '100%' },
  settleBanner: { alignItems: 'center', gap: 8 },
  premiumBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  premiumBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#FFF', letterSpacing: 1 },
  settleMessage: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },

  goldBtn: { height: 56, width: '100%', backgroundColor: '#D4AF37', borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowOffset: {width: 0, height: 4}, shadowRadius: 5, elevation: 5 },
  goldBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#000', letterSpacing: 1.5 },

  disabled: { opacity: 0.4 }
});