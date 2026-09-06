import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useCoach, Decision } from '@/lib/context';
import { getBasicStrategy, Action } from '@/lib/strategy';
import { Card, GameHand, canDouble, canSplit, cardLabel, cardRankForStrategy, createShoe, dealInitialRound, dealerShouldHit, draw, handTotal, isBlackjack, settleHand, settleInsurance } from '@/lib/game';
import { CardView } from '@/components/CardView';
import { Chip, ChipStack } from '@/components/Chip';

type Phase = 'betting' | 'dealing' | 'insurance' | 'playing' | 'settled';
const chips = [5, 25, 100, 250, 500];
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const buzz = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
const { width, height } = Dimensions.get('window');

export default function SessionScreen() {
  const { activeSession, endSession, recordHand } = useCoach();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rules = activeSession?.rules;
  const [bankroll, setBankroll] = useState(1000);
  const [bets, setBets] = useState<number[]>([0, 0, 0]);
  const [lastBets, setLastBets] = useState<number[]>([25, 0, 0]);
  const [selectedSpot, setSelectedSpot] = useState(0);
  const [shoe, setShoe] = useState<Card[]>(() => createShoe(rules?.decks ?? 6));
  const [dealer, setDealer] = useState<Card[]>([]);
  const [hands, setHands] = useState<GameHand[]>([]);
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>('betting');
  const [message, setMessage] = useState('PLACE YOUR BETS');
  const [lastNet, setLastNet] = useState(0);
  const [insuranceBet, setInsuranceBet] = useState(0);
  const [insuranceNet, setInsuranceNet] = useState<number | undefined>();
  const decisionsRef = useRef<Decision[]>([]);
  const roundBetsRef = useRef<number[]>([0, 0, 0]);
  const endingRef = useRef(false);
  const isShort = height <= 740;
  const totalBet = bets.reduce((sum, bet) => sum + bet, 0);
  const current = hands[active];

  useEffect(() => { if (!activeSession && !endingRef.current) router.replace('/'); }, [activeSession, router]);
  if (!activeSession || !rules) return null;

  const addDecision = (action: Action, hand: GameHand) => {
    if (!dealer[0]) return;
    const playerCards = hand.cards.map(cardRankForStrategy);
    const dealerCard = cardRankForStrategy(dealer[0]);
    const correct = getBasicStrategy(playerCards, dealerCard, rules);
    decisionsRef.current = [...decisionsRef.current, { id: uid(), spot: hand.spot, playerCards, dealerCard, chosen: action, correct, isCorrect: correct === action }];
  };
  const handsAtSpot = (hand: GameHand, all = hands) => all.filter(item => item.spot === hand.spot).length;
  const playable = (hand: GameHand, all = hands) => {
    const total = handTotal(hand.cards).total;
    return !hand.surrendered && total < 21 && !isBlackjack(hand) && (!hand.splitAces || canSplit(hand, rules, handsAtSpot(hand, all)));
  };

  const settle = async (finalHands: GameHand[], initialDealer: Card[], shoeNow: Card[], forcedInsNet?: number, forcedInsBet?: number) => {
    setPhase('settled');
    let dealerCards = initialDealer;
    const needsDealer = finalHands.some(hand => !hand.surrendered && handTotal(hand.cards).total <= 21 && !isBlackjack(hand));
    await sleep(300); setDealer([...dealerCards]);
    while (needsDealer && dealerShouldHit(dealerCards, rules)) {
      await sleep(380);
      const next = draw(shoeNow); shoeNow = next.shoe; dealerCards = [...dealerCards, next.card];
      setDealer(dealerCards); buzz();
    }
    const resolved = finalHands.map(hand => ({ ...hand, ...settleHand(hand, dealerCards) }));
    const credit = resolved.reduce((sum, hand) => sum + settleHand(hand, dealerCards).credit, 0);
    const wagered = resolved.reduce((sum, hand) => sum + hand.bet, 0);
    const actualInsNet = forcedInsNet ?? insuranceNet ?? 0;
    const actualInsBet = forcedInsBet ?? insuranceBet;
    const net = credit - wagered + actualInsNet;
    setBankroll(value => value + credit);
    setHands(resolved); setShoe(shoeNow); setLastNet(net);
    recordHand({
      id: uid(), decisions: decisionsRef.current, outcome: net > 0 ? 'Win' : net < 0 ? 'Loss' : 'Push',
      bet: wagered, netChange: net, spotBets: [...roundBetsRef.current], roundLabel: resolved.length > 1 ? 'Simultaneous table round' : undefined,
      insuranceBet: actualInsBet || undefined, insuranceNet: actualInsNet || undefined,
      dealerCards: dealerCards.map(cardLabel),
      playerHands: resolved.map(hand => ({ cards: hand.cards.map(cardLabel), bet: hand.bet, outcome: hand.outcome!, netChange: settleHand(hand, dealerCards).credit - hand.bet, spot: hand.spot, label: `Spot ${hand.spot}` }))
    });
    setMessage(net > 0 ? `TABLE UP $${net}` : net < 0 ? 'DEALER TAKES THE ROUND' : 'TABLE PUSH');
  };
  const advance = async (updated: GameHand[], shoeNow: Card[], index: number) => {
    const next = updated.findIndex((hand, i) => i > index && playable(hand, updated));
    if (next >= 0) { setHands(updated); setShoe(shoeNow); setActive(next); setPhase('playing'); return; }
    await settle(updated, dealer, shoeNow);
  };
  const deal = async () => {
    if (!totalBet || totalBet > bankroll) return;
    roundBetsRef.current = [...bets];
    setBankroll(value => value - totalBet); setLastBets([...bets]); setBets([0, 0, 0]);
    setPhase('dealing'); setMessage('DEALING TABLE...'); setInsuranceBet(0); setInsuranceNet(undefined); decisionsRef.current = [];
    const fresh = shoe.length < Math.round(rules.decks * 52 * .28) ? createShoe(rules.decks) : shoe;
    const round = dealInitialRound(fresh, bets, uid);
    const shown = round.hands.map(hand => ({ ...hand, cards: [] }));
    setDealer([]); setHands(shown); setShoe(round.shoe);
    for (const event of round.events) {
      await sleep(280);
      if (event.kind === 'dealer') setDealer(old => [...old, event.card]);
      else setHands(old => old.map(hand => hand.spot === event.spot ? { ...hand, cards: [...hand.cards, event.card] } : hand));
      buzz();
    }
    setHands(round.hands); setDealer(round.dealer);
    if (round.dealer[0].rank === 'A') { setPhase('insurance'); setMessage('TABLE INSURANCE?'); return; }
    const dealerBJ = handTotal(round.dealer).total === 21;
    if (dealerBJ) { await sleep(350); await settle(round.hands, round.dealer, round.shoe); return; }
    const firstPlayable = round.hands.findIndex(hand => playable(hand, round.hands));
    if (firstPlayable < 0) { await sleep(350); await settle(round.hands, round.dealer, round.shoe); return; }
    setActive(firstPlayable); setPhase('playing'); setMessage(`SPOT ${round.hands[firstPlayable].spot} TO ACT`);
  };
  const resolveInsurance = async (stake: number) => {
    const dealerBJ = handTotal(dealer).total === 21;
    const result = settleInsurance(stake, dealerBJ);
    await sleep(350);
    setInsuranceNet(result.net);
    if (result.credit) setBankroll(value => value + result.credit);
    if (dealerBJ) {
      await settle(hands, dealer, shoe, result.net, stake);
      return;
    }
    const firstPlayable = hands.findIndex(hand => playable(hand, hands));
    if (firstPlayable < 0) {
      await settle(hands, dealer, shoe, result.net, stake);
      return;
    }
    setActive(firstPlayable); setPhase('playing'); setMessage(`SPOT ${hands[firstPlayable].spot} TO ACT`);
  };
  const buyInsurance = async () => {
    const stake = hands.filter(hand => !hand.fromSplit).reduce((sum, hand) => sum + hand.bet, 0) / 2;
    if (!stake || bankroll < stake) return;
    const lead = hands[0]; addDecision('I', lead);
    setBankroll(value => value - stake); setInsuranceBet(stake); setPhase('dealing'); await resolveInsurance(stake);
  };
  const declineInsurance = async () => { if (hands[0]) addDecision('N', hands[0]); setPhase('dealing'); await resolveInsurance(0); };
  const act = async (action: Action) => {
    if (!current || phase !== 'playing') return;
    addDecision(action, current); buzz();
    if (action === 'S') return advance(hands, shoe, active);
    if (action === 'R') return advance(hands.map((hand, i) => i === active ? { ...hand, surrendered: true } : hand), shoe, active);
    if (action === 'H') {
      if (current.splitAces) return;
      setPhase('dealing'); await sleep(180); const next = draw(shoe);
      const updated = hands.map((hand, i) => i === active ? { ...hand, cards: [...hand.cards, next.card] } : hand);
      setHands(updated); setShoe(next.shoe);
      if (handTotal(updated[active].cards).total >= 21) { await sleep(300); return advance(updated, next.shoe, active); }
      setPhase('playing'); return;
    }
    if (action === 'D' && bankroll >= current.bet) {
      setPhase('dealing'); setBankroll(value => value - current.bet);
      const next = draw(shoe); const updated = hands.map((hand, i) => i === active ? { ...hand, bet: hand.bet * 2, doubled: true, cards: [...hand.cards, next.card] } : hand);
      setHands(updated); setShoe(next.shoe); await sleep(350); return advance(updated, next.shoe, active);
    }
    if (action === 'P' && bankroll >= current.bet && canSplit(current, rules, handsAtSpot(current))) {
      setPhase('dealing'); setBankroll(value => value - current.bet);
      const aces = current.cards[0].rank === 'A';
      const left: GameHand = { ...current, id: uid(), cards: [current.cards[0]], fromSplit: true, splitAces: aces, doubled: false, surrendered: false };
      const right: GameHand = { ...current, id: uid(), cards: [current.cards[1]], fromSplit: true, splitAces: aces, doubled: false, surrendered: false };
      let next = draw(shoe); left.cards.push(next.card); await sleep(280); next = draw(next.shoe); right.cards.push(next.card);
      const updated = [...hands.slice(0, active), left, right, ...hands.slice(active + 1)];
      setHands(updated); setShoe(next.shoe); await sleep(300);
      if (aces) return advance(updated, next.shoe, active - 1);
      setPhase('playing');
    }
  };
  const addChip = (amount: number) => {
    if (phase !== 'betting' || totalBet + amount > bankroll) return;
    setBets(old => old.map((bet, i) => i === selectedSpot ? bet + amount : bet)); buzz();
  };
  const newHand = () => { setDealer([]); setHands([]); setActive(0); setPhase('betting'); setMessage(bankroll >= 5 ? 'PLACE YOUR BETS' : 'OUT OF CHIPS'); };
  const end = () => { endingRef.current = true; const id = endSession(bankroll); router.replace(id ? `/report/${id}` : '/'); };
  const insuranceStake = hands.filter(hand => !hand.fromSplit).reduce((sum, hand) => sum + hand.bet, 0) / 2;
  const canD = !!current && bankroll >= current.bet && canDouble(current, rules);
  const canP = !!current && bankroll >= current.bet && canSplit(current, rules, handsAtSpot(current));
  const canR = !!current && current.cards.length === 2 && !current.fromSplit && rules.surrender === 'late';

  return <View style={[styles.page, { paddingTop: Math.max(insets.top, 8) + (Platform.OS === 'web' ? 40 : 0) }]}>
    <LinearGradient colors={['#06120e', '#020605']} style={StyleSheet.absoluteFill} />
    <View style={styles.table}><LinearGradient colors={['#26744a', '#092a1b']} style={styles.felt}>
      <View style={styles.rail} /><View style={styles.glow} />
      <View style={styles.rack}>{chips.map(value => <Chip key={value} amount={value} size={23} />)}</View>
      <View style={styles.dealer}><Text style={styles.zoneLabel}>DEALER</Text><View style={styles.cardRow}>{dealer.map((card, i) => <CardView key={card.id} card={card} index={i} hidden={i === 1 && phase !== 'settled'} isShort isDealer />)}</View></View>
      <View style={styles.rules}><Text style={styles.rulesMain}>BLACKJACK PAYS 3 TO 2</Text><Text style={styles.rulesSub}>{rules.dealerHitsSoft17 ? 'DEALER HITS SOFT 17' : 'DEALER STANDS ON 17'} · INSURANCE 2 TO 1</Text></View>
      {phase === 'betting' ? <View style={styles.spots}>{bets.map((bet, i) => <TouchableOpacity testID={`bet-spot-${i + 1}`} key={i} onPress={() => setSelectedSpot(i)} style={[styles.spot, selectedSpot === i && styles.spotSelected]}><Text style={styles.spotNumber}>SPOT {i + 1}</Text>{bet ? <><ChipStack amount={bet} size={isShort ? 33 : 40} /><Text style={styles.spotBet}>${bet}</Text></> : <Text style={styles.place}>TAP TO BET</Text>}</TouchableOpacity>)}</View> :
      <View style={styles.handArea}>{hands.map((hand, index) => <View key={hand.id} style={[styles.handBlock, hand.spot === 2 && styles.middleHand]}><Text style={[styles.handMeta, index === active && phase === 'playing' && styles.activeMeta]}>S{hand.spot} · {handTotal(hand.cards).total} · ${hand.bet}</Text><View style={styles.cardRow}>{hand.cards.map((card, i) => <CardView key={card.id} card={card} index={i} isShort />)}</View>{phase === 'settled' && <Text style={styles.outcome}>{hand.outcome}</Text>}</View>)}</View>}
    </LinearGradient></View>
    {phase === 'settled' && <Animated.View entering={FadeInUp} style={styles.result}><Text style={styles.resultText}>{message}</Text>{lastNet !== 0 && <Text style={styles.resultNet}>{lastNet > 0 ? '+' : ''}${lastNet}</Text>}</Animated.View>}
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 10) + (Platform.OS === 'web' ? 26 : 0) }]}><LinearGradient colors={['#29150b', '#120904']} style={StyleSheet.absoluteFill} />
      <View style={styles.status}><TouchableOpacity testID="end-session" onPress={end}><Feather name="log-out" size={20} color="#d1bf9a" /></TouchableOpacity><Text style={styles.bankroll}>BANKROLL  ${bankroll.toLocaleString()}</Text><Text style={styles.used}>{(rules.decks * 52 - shoe.length)} USED</Text></View>
      {phase === 'betting' ? <><View style={styles.tools}><TouchableOpacity onPress={() => setBets(old => old.map((b, i) => i === selectedSpot ? 0 : b))}><Text style={styles.tool}>CLEAR SPOT</Text></TouchableOpacity><TouchableOpacity onPress={() => setBets(lastBets.map((b, i) => i === 0 ? Math.min(b, bankroll) : b))} disabled={lastBets.reduce((a,b) => a+b, 0) > bankroll}><Text style={styles.tool}>REPEAT TABLE</Text></TouchableOpacity></View><View style={styles.chips}>{chips.map(amount => <TouchableOpacity key={amount} testID={`chip-${amount}`} onPress={() => addChip(amount)} disabled={totalBet + amount > bankroll}><Chip amount={amount} size={43} disabled={totalBet + amount > bankroll} /></TouchableOpacity>)}</View><TouchableOpacity testID="deal-button" onPress={deal} disabled={!totalBet} style={[styles.primary, !totalBet && styles.dim]}><Text style={styles.buttonText}>DEAL ${totalBet}</Text></TouchableOpacity></> :
      phase === 'insurance' ? <><Text style={styles.prompt}>INSURE THE TABLE FOR ${insuranceStake}</Text><View style={styles.actionRow}><TouchableOpacity testID="insurance-take" onPress={buyInsurance} disabled={bankroll < insuranceStake} style={styles.insure}><Text style={styles.darkButton}>INSURE</Text></TouchableOpacity><TouchableOpacity testID="insurance-decline" onPress={declineInsurance} style={styles.neutral}><Text style={styles.buttonText}>NO INSURANCE</Text></TouchableOpacity></View></> :
      phase === 'playing' ? <><Text style={styles.prompt}>SPOT {current?.spot} TO ACT</Text><View style={styles.actionRow}><Button id="action-hit" label="HIT" onPress={() => act('H')} disabled={!!current?.splitAces} /><Button id="action-stand" label="STAND" onPress={() => act('S')} /></View><View style={styles.actionRow}><Button id="action-double" label="DOUBLE" onPress={() => act('D')} disabled={!canD} /><Button id="action-split" label="SPLIT" onPress={() => act('P')} disabled={!canP} /></View>{canR && <TouchableOpacity testID="action-surrender" onPress={() => act('R')}><Text style={styles.surrender}>SURRENDER</Text></TouchableOpacity>}</> :
      phase === 'settled' ? <TouchableOpacity testID="next-hand" onPress={newHand} style={styles.primary}><Text style={styles.buttonText}>NEXT ROUND</Text></TouchableOpacity> : <Text style={styles.prompt}>DEALING...</Text>}
    </View>
  </View>;
}
function Button({ id, label, onPress, disabled }: { id: string; label: string; onPress: () => void; disabled?: boolean }) { return <TouchableOpacity testID={id} onPress={onPress} disabled={disabled} style={[styles.action, disabled && styles.dim]}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#020605'},table:{position:'absolute',top:30,left:-width*.38,width:width*1.76,height:height*.78,borderTopLeftRadius:width,borderTopRightRadius:width,overflow:'hidden',borderWidth:9,borderColor:'#5a2c11'},felt:{flex:1,alignItems:'center',paddingHorizontal:width*.38},rail:{position:'absolute',top:0,width:'100%',height:10,backgroundColor:'#c37a31',opacity:.4},glow:{position:'absolute',top:30,width:width*.9,height:height*.42,borderRadius:width,backgroundColor:'rgba(201,242,166,.06)'},rack:{position:'absolute',top:17,flexDirection:'row',gap:1,padding:3,borderRadius:18,backgroundColor:'#111'},dealer:{alignItems:'center',marginTop:60,minHeight:100},zoneLabel:{fontFamily:'Inter_700Bold',fontSize:9,letterSpacing:2,color:'#e8ce85',marginBottom:4},cardRow:{flexDirection:'row',justifyContent:'center'},rules:{alignItems:'center',marginTop:4,opacity:.55},rulesMain:{fontFamily:'Inter_700Bold',fontSize:13,letterSpacing:2,color:'#f2d472'},rulesSub:{fontFamily:'Inter_600SemiBold',fontSize:8,letterSpacing:1,color:'#fff',marginTop:3},spots:{flexDirection:'row',width:'94%',justifyContent:'space-between',marginTop:height <= 740 ? 20 : 35},spot:{width:'30%',height:height <= 740 ? 104 : 125,borderRadius:65,borderWidth:2,borderColor:'rgba(255,255,255,.22)',backgroundColor:'rgba(0,0,0,.13)',alignItems:'center',justifyContent:'center'},spotSelected:{borderColor:'#f2d472',backgroundColor:'rgba(242,212,114,.14)',transform:[{scale:1.06}]},spotNumber:{fontFamily:'Inter_700Bold',fontSize:8,letterSpacing:1,color:'#ddd'},place:{fontFamily:'Inter_600SemiBold',fontSize:8,color:'rgba(255,255,255,.6)',marginTop:10},spotBet:{fontFamily:'Inter_700Bold',fontSize:12,color:'#f2d472',marginTop:-5},handArea:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:8,width:'100%',marginTop:18},handBlock:{alignItems:'center',maxWidth:width*.44},middleHand:{},handMeta:{fontFamily:'Inter_700Bold',fontSize:10,color:'#e7e2d2',backgroundColor:'rgba(0,0,0,.5)',paddingHorizontal:7,paddingVertical:3,borderRadius:8,marginBottom:4},activeMeta:{backgroundColor:'#f2d472',color:'#182018'},outcome:{fontFamily:'Inter_700Bold',fontSize:9,color:'#f2d472',marginTop:3},result:{position:'absolute',top:height*.39,alignSelf:'center',alignItems:'center',backgroundColor:'rgba(11,14,10,.95)',borderColor:'#d6ad54',borderWidth:1,borderRadius:14,paddingHorizontal:20,paddingVertical:10},resultText:{fontFamily:'Inter_700Bold',fontSize:15,color:'#fff',letterSpacing:1},resultNet:{fontFamily:'Inter_700Bold',fontSize:18,color:'#f2d472'},dock:{position:'absolute',bottom:0,width:'100%',paddingHorizontal:16,paddingTop:10,borderTopWidth:2,borderColor:'#7a411e',overflow:'hidden'},status:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},bankroll:{fontFamily:'Inter_700Bold',fontSize:16,color:'#f2d472'},used:{fontFamily:'Inter_600SemiBold',fontSize:9,color:'#c9bfa8'},tools:{flexDirection:'row',justifyContent:'space-between',marginBottom:7},tool:{fontFamily:'Inter_700Bold',fontSize:10,letterSpacing:1,color:'#e4d7c0'},chips:{flexDirection:'row',justifyContent:'space-around',marginBottom:9},primary:{height:48,borderRadius:12,backgroundColor:'#1d5d3a',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#78b46b'},buttonText:{fontFamily:'Inter_700Bold',fontSize:13,color:'#fff',letterSpacing:1},prompt:{fontFamily:'Inter_700Bold',fontSize:11,color:'#f2d472',letterSpacing:1,textAlign:'center',marginBottom:7},actionRow:{flexDirection:'row',gap:8,marginBottom:7},action:{flex:1,height:42,borderRadius:10,backgroundColor:'#24567b',alignItems:'center',justifyContent:'center'},neutral:{flex:1,height:44,borderRadius:10,borderWidth:1,borderColor:'#806b50',alignItems:'center',justifyContent:'center'},insure:{flex:1,height:44,borderRadius:10,backgroundColor:'#e3bd55',alignItems:'center',justifyContent:'center'},darkButton:{fontFamily:'Inter_700Bold',fontSize:12,color:'#182018',letterSpacing:1},surrender:{fontFamily:'Inter_700Bold',fontSize:10,color:'#d9c5a0',textAlign:'center',paddingBottom:2,letterSpacing:1},dim:{opacity:.38}
});