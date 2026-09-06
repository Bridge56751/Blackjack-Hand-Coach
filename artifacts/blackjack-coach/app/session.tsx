import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useCoach, Decision } from '@/lib/context';
import { getBasicStrategy, Action } from '@/lib/strategy';
import { useColors } from '@/hooks/useColors';
import { Card, GameHand, canDouble, canSplit, cardLabel, cardRankForStrategy, createShoe, dealerShouldHit, draw, handTotal, isBlackjack, isRed, settleHand } from '@/lib/game';

type Phase = 'betting' | 'playing' | 'settled';
const chips = [5, 10, 25, 100];
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const buzz = (kind: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => { if (Platform.OS !== 'web') Haptics.impactAsync(kind); };

export default function SessionScreen() {
  const { activeSession, endSession, recordHand } = useCoach();
  const colors = useColors(); const router = useRouter(); const insets = useSafeAreaInsets();
  const rules = activeSession?.rules;
  const [bankroll, setBankroll] = useState(1000); const [bet, setBet] = useState(0); const [lastBet, setLastBet] = useState(25);
  const [shoe, setShoe] = useState<Card[]>(() => createShoe(rules?.decks ?? 6));
  const [dealer, setDealer] = useState<Card[]>([]); const [hands, setHands] = useState<GameHand[]>([]);
  const [active, setActive] = useState(0); const [phase, setPhase] = useState<Phase>('betting');
  const decisionsRef = useRef<Decision[]>([]);
  const endingRef = useRef(false);
  const [message, setMessage] = useState('Place your wager');
  useEffect(() => { if (!activeSession && !endingRef.current) router.replace('/'); }, [activeSession, router]);
  const current = hands[active]; const total = current ? handTotal(current.cards) : { total: 0, soft: false };
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
    const net = credit - totalBet; setBankroll(value => value + credit); setDealer(dealerCards); setHands(resolved); setShoe(currentShoe); setPhase('settled');
    const outcome = net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Push';
    recordHand({ id: uid(), decisions: decisionsRef.current, outcome, bet: totalBet, netChange: net, dealerCards: dealerCards.map(cardLabel), playerHands: resolved.map(h => ({ cards: h.cards.map(cardLabel), bet: h.bet, outcome: h.outcome!, netChange: settleHand(h, dealerCards).credit - h.bet })) });
    setMessage(net > 0 ? `You collect +$${credit - totalBet}` : net < 0 ? `Table takes $${Math.abs(net)}` : 'Push — wager returned');
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
    setBankroll(value => value - bet); setLastBet(bet); setBet(0); setDealer([up, hole]); setHands([hand]); setShoe(a.shoe); setActive(0); decisionsRef.current = []; setPhase('playing'); setMessage('Your move');
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
  const newHand = () => { setDealer([]); setHands([]); decisionsRef.current = []; setActive(0); setPhase('betting'); setMessage(bankroll >= 5 ? 'Place your wager' : 'Your stake is empty'); };
  const addChip = (amount: number) => { if (phase === 'betting' && bet + amount <= bankroll) { setBet(v => v + amount); buzz(); } };
  const end = () => {
    endingRef.current = true;
    const id = endSession(bankroll);
    if (id) router.replace(`/report/${id}`);
    else router.replace('/');
  };
  if (!activeSession || !rules) return null;
  const canD = current && bankroll >= current.bet && canDouble(current, rules); const canP = current && bankroll >= current.bet && canSplit(current, rules, hands.length);
  const canR = current && current.cards.length === 2 && !current.fromSplit && rules.surrender === 'late';
  return <View style={[styles.page, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) + (Platform.OS === 'web' ? 50 : 0) }]}>
    <View style={styles.header}><TouchableOpacity testID="end-session" onPress={end}><Text style={[styles.end, { color: colors.mutedForeground }]}>END SESSION</Text></TouchableOpacity><View style={styles.bank}><Text style={[styles.micro, { color: colors.mutedForeground }]}>BANKROLL</Text><Text style={[styles.money, { color: colors.primary }]}>${bankroll}</Text></View><Text style={[styles.shoe, { color: colors.mutedForeground }]}>{used} dealt</Text></View>
    <View style={[styles.table, { borderColor: colors.border }]}><View style={[styles.arc, { borderColor: colors.primary }]} /><Text style={[styles.dealerLabel, { color: colors.mutedForeground }]}>DEALER {phase === 'settled' && `• ${handTotal(dealer).total}`}</Text><CardRow cards={dealer} hidden={phase === 'playing'} colors={colors} />
      <View style={styles.centerMark}><Text style={[styles.markText, { color: colors.primary }]}>BLACKJACK COACH</Text><Text style={[styles.markSub, { color: colors.mutedForeground }]}>PLAY THE HAND</Text></View>
      <View style={styles.handZone}>{hands.map((hand, index) => <View key={hand.id} style={[styles.handBlock, index === active && phase === 'playing' && { borderColor: colors.primary }]}><View style={styles.handMeta}><Text style={[styles.playerLabel, { color: colors.mutedForeground }]}>HAND {hands.length > 1 ? index + 1 : ''} • ${hand.bet}</Text><Text style={[styles.total, { color: colors.foreground }]}>{handTotal(hand.cards).total}{handTotal(hand.cards).soft ? ' soft' : ''}</Text></View><CardRow cards={hand.cards} colors={colors} />{phase === 'settled' && <Text style={[styles.outcome, { color: hand.outcome === 'Loss' || hand.outcome === 'Bust' ? colors.destructive : colors.primary }]}>{hand.outcome}</Text>}</View>)}</View>
    </View>
    <View style={[styles.console, { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'web' ? 26 : 0) }]}>{phase === 'betting' ? <>{bankroll < 5 ? <><Text style={[styles.prompt, { color: colors.mutedForeground }]}>Your practice stake is empty.</Text><TouchableOpacity testID="reset-bankroll" onPress={() => { setBankroll(1000); setMessage('Fresh practice stake'); }} style={[styles.deal, { backgroundColor: colors.primary }]}><Text style={[styles.dealText, { color: colors.primaryForeground }]}>RESET BANKROLL</Text></TouchableOpacity></> : <><View style={styles.betline}><Text style={[styles.micro, { color: colors.mutedForeground }]}>ON THE FELT</Text><Text style={[styles.bet, { color: colors.foreground }]}>${bet || '—'}</Text></View><View style={styles.chips}>{chips.map(amount => <TouchableOpacity key={amount} testID={`chip-${amount}`} disabled={bet + amount > bankroll} onPress={() => addChip(amount)} style={[styles.chip, { borderColor: colors.primary }, bet + amount > bankroll && styles.disabled]}><Text style={[styles.chipText, { color: colors.primary }]}>${amount}</Text></TouchableOpacity>)}</View><View style={styles.betActions}><TouchableOpacity onPress={() => setBet(0)} disabled={!bet}><Text style={[styles.minor, { color: colors.mutedForeground }]}>CLEAR</Text></TouchableOpacity><TouchableOpacity onPress={() => setBet(Math.min(lastBet, bankroll))} disabled={!lastBet || lastBet > bankroll}><Text style={[styles.minor, { color: colors.mutedForeground }]}>REPEAT ${lastBet}</Text></TouchableOpacity></View><TouchableOpacity testID="deal-button" disabled={!bet} onPress={deal} style={[styles.deal, { backgroundColor: colors.primary }, !bet && styles.disabled]}><Feather name="play" size={19} color={colors.primaryForeground}/><Text style={[styles.dealText, { color: colors.primaryForeground }]}>DEAL</Text></TouchableOpacity></>}</> : phase === 'playing' ? <><Text style={[styles.prompt, { color: colors.mutedForeground }]}>{message}</Text><View style={styles.actionRow}><TableAction testID="action-hit" label="HIT" icon="plus" disabled={!!current?.splitAces} onPress={() => act('H')} colors={colors}/><TableAction testID="action-stand" label="STAND" icon="check" onPress={() => act('S')} colors={colors}/><TableAction testID="action-double" label="DOUBLE" icon="corner-down-right" disabled={!canD} onPress={() => act('D')} colors={colors}/><TableAction testID="action-split" label="SPLIT" icon="git-branch" disabled={!canP} onPress={() => act('P')} colors={colors}/></View>{canR && <TouchableOpacity testID="action-surrender" onPress={() => act('R')}><Text style={[styles.surrender, { color: colors.mutedForeground }]}>SURRENDER THIS HAND</Text></TouchableOpacity>}</> : <Animated.View entering={FadeInUp.duration(280)} style={styles.settle}><Text style={[styles.settleTitle, { color: colors.foreground }]}>{message}</Text><TouchableOpacity testID="next-hand" onPress={newHand} style={[styles.deal, { backgroundColor: colors.primary }]}><Text style={[styles.dealText, { color: colors.primaryForeground }]}>NEXT HAND</Text><Feather name="arrow-right" size={19} color={colors.primaryForeground}/></TouchableOpacity></Animated.View>}</View>
  </View>;
}
function CardRow({ cards, hidden, colors }: { cards: Card[]; hidden?: boolean; colors: any }) { return <View style={styles.cardRow}>{cards.map((card, i) => <Animated.View entering={FadeInDown.delay(i * 90).duration(220)} key={card.id} style={[styles.card, { backgroundColor: hidden && i === 1 ? colors.secondary : '#F7F0DD', marginLeft: i ? -28 : 0 }]}>{hidden && i === 1 ? <Feather name="layers" size={25} color={colors.primary}/> : <><Text style={[styles.rank, { color: isRed(card) ? colors.destructive : '#172019' }]}>{card.rank === 'T' ? '10' : card.rank}</Text><Text style={[styles.suit, { color: isRed(card) ? colors.destructive : '#172019' }]}>{card.suit}</Text></>}</Animated.View>)}</View>; }
function TableAction({ label, icon, onPress, disabled, colors, testID }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void; disabled?: boolean; colors: any; testID: string }) { return <TouchableOpacity testID={testID} disabled={disabled} onPress={onPress} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }, disabled && styles.disabled]}><Feather name={icon} size={16} color={colors.primary}/><Text style={[styles.actionText, { color: colors.foreground }]}>{label}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({ page:{flex:1}, header:{height:54,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},end:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:1},bank:{alignItems:'center'},micro:{fontFamily:'Inter_700Bold',fontSize:9,letterSpacing:1.4},money:{fontFamily:'Inter_700Bold',fontSize:22},shoe:{fontFamily:'Inter_500Medium',fontSize:11,width:45,textAlign:'right'},table:{flex:1,marginHorizontal:10,borderRadius:32,borderWidth:1,overflow:'hidden',paddingTop:16,alignItems:'center',backgroundColor:'rgba(0,0,0,.13)'},arc:{position:'absolute',top:-112,width:300,height:180,borderRadius:150,borderWidth:1,opacity:.65},dealerLabel:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:1.4,marginBottom:7},cardRow:{flexDirection:'row',minHeight:91,justifyContent:'center'},card:{width:62,height:88,borderRadius:7,padding:7,justifyContent:'space-between',shadowColor:'#00160b',shadowOpacity:.35,shadowRadius:5,elevation:4},rank:{fontFamily:'Inter_700Bold',fontSize:20},suit:{fontSize:19,alignSelf:'flex-end'},centerMark:{alignItems:'center',marginTop:15,marginBottom:10},markText:{fontFamily:'Inter_700Bold',fontSize:12,letterSpacing:2.3},markSub:{fontFamily:'Inter_500Medium',fontSize:9,letterSpacing:1.4,marginTop:4},handZone:{width:'100%',paddingHorizontal:13,marginTop:'auto',paddingBottom:15},handBlock:{borderWidth:1,borderColor:'transparent',borderRadius:13,alignItems:'center',padding:6,marginTop:4},handMeta:{width:'94%',flexDirection:'row',justifyContent:'space-between',marginBottom:2},playerLabel:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:1.2},total:{fontFamily:'Inter_700Bold',fontSize:13},outcome:{fontFamily:'Inter_700Bold',fontSize:11,letterSpacing:1.2,marginTop:-3},console:{paddingHorizontal:18,paddingTop:12,minHeight:185},betline:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'},bet:{fontFamily:'Inter_700Bold',fontSize:25},chips:{flexDirection:'row',justifyContent:'space-between',marginTop:9},chip:{width:54,height:54,borderRadius:27,borderWidth:3,alignItems:'center',justifyContent:'center',borderStyle:'dashed'},chipText:{fontFamily:'Inter_700Bold',fontSize:12},betActions:{flexDirection:'row',justifyContent:'space-between',marginTop:10,paddingHorizontal:5},minor:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:1},deal:{height:52,borderRadius:10,marginTop:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},dealText:{fontFamily:'Inter_700Bold',fontSize:15,letterSpacing:1.7},disabled:{opacity:.3},prompt:{fontFamily:'Inter_600SemiBold',fontSize:12,textAlign:'center',letterSpacing:.8,marginBottom:9},actionRow:{flexDirection:'row',gap:7},action:{flex:1,height:55,borderWidth:1,borderRadius:9,alignItems:'center',justifyContent:'center',gap:4},actionText:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:.6},surrender:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:1,textAlign:'center',marginTop:11},settle:{alignItems:'center'},settleTitle:{fontFamily:'Inter_700Bold',fontSize:18,textAlign:'center'} });