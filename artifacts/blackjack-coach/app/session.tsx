import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Modal } from 'react-native';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useCoach, Decision } from '@/lib/context';
import { getBasicStrategy, getActionName, Action } from '@/lib/strategy';
import { Card, GameHand, canDouble, canSplit, cardLabel, cardRankForStrategy, createShoe, dealInitialRound, dealerShouldHit, draw, handTotal, isBlackjack, settleHand, settleInsurance, shouldReshuffle } from '@/lib/game';
import { CardView } from '@/components/CardView';
import { Chip, ChipStack } from '@/components/Chip';
import { estimatedPlayerEdge, hiLoValue, trueCount } from '@/lib/counting';
import { estimateHitStandOdds } from '@/lib/odds';

type Phase = 'betting' | 'dealing' | 'insurance' | 'playing' | 'settled';
const chips = [5, 25, 100, 250, 500];
const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const buzz = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

export default function SessionScreen() {
  const { activeSession, endSession, recordHand, addBankroll } = useCoach();
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
  const [runningCount, setRunningCount] = useState(0);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const runningCountRef = useRef(0);
  const decisionsRef = useRef<Decision[]>([]);
  const roundBetsRef = useRef<number[]>([0, 0, 0]);
  const endingRef = useRef(false);
  const totalBet = bets.reduce((sum, bet) => sum + bet, 0);
  const current = hands[active];
  const availableBetSpots = rules?.multipleHandsEnabled === false ? bets.slice(0, 1) : bets;
  const singleHandMode = availableBetSpots.length === 1;

  useEffect(() => { if (!activeSession && !endingRef.current) router.replace('/'); }, [activeSession, router]);
  if (!activeSession || !rules) return null;

  const addDecision = (action: Action, hand: GameHand) => {
    if (!dealer[0]) return;
    const playerCards = hand.cards.map(cardRankForStrategy);
    const dealerCard = cardRankForStrategy(dealer[0]);
    const correct = getBasicStrategy(playerCards, dealerCard, rules);
    decisionsRef.current = [...decisionsRef.current, {
      id: uid(),
      spot: hand.spot,
      playerCards,
      dealerCard,
      playerCardLabels: hand.cards.map(cardLabel),
      dealerCardLabel: cardLabel(dealer[0]),
      chosen: action,
      correct,
      isCorrect: correct === action,
    }];
  };
  const handsAtSpot = (hand: GameHand, all = hands) => all.filter(item => item.spot === hand.spot).length;
  const playable = (hand: GameHand, all = hands) => {
    const total = handTotal(hand.cards).total;
    return !hand.surrendered && total < 21 && !isBlackjack(hand) && (!hand.splitAces || canSplit(hand, rules, handsAtSpot(hand, all)));
  };
  const countCards = (...cards: Card[]) => {
    if (!rules.cardCountingEnabled) return;
    runningCountRef.current += cards.reduce((sum, card) => sum + hiLoValue(card), 0);
    setRunningCount(runningCountRef.current);
  };
  const resetCount = () => {
    runningCountRef.current = 0;
    setRunningCount(0);
  };

  const settle = async (finalHands: GameHand[], initialDealer: Card[], shoeNow: Card[], forcedInsNet?: number, forcedInsBet?: number) => {
    setPhase('settled');
    let dealerCards = initialDealer;
    if (initialDealer[1]) countCards(initialDealer[1]);
    const needsDealer = finalHands.some(hand => !hand.surrendered && handTotal(hand.cards).total <= 21 && !isBlackjack(hand));
    await sleep(300); setDealer([...dealerCards]);
    while (needsDealer && dealerShouldHit(dealerCards, rules)) {
      await sleep(380);
      const next = draw(shoeNow); shoeNow = next.shoe; dealerCards = [...dealerCards, next.card];
      countCards(next.card);
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
    setMessage(net > 0 ? `TABLE UP $${net}` : net < 0 ? 'DEALER TAKES IT' : 'TABLE PUSH');
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
    setPhase('dealing'); setMessage('DEALING...'); setInsuranceBet(0); setInsuranceNet(undefined); decisionsRef.current = [];
    const needsShuffle = shouldReshuffle(shoe.length, rules.decks);
    const fresh = needsShuffle ? createShoe(rules.decks) : shoe;
    if (needsShuffle) resetCount();
    const round = dealInitialRound(fresh, bets, uid);
    const shown = round.hands.map(hand => ({ ...hand, cards: [] }));
    setDealer([]); setHands(shown); setShoe(round.shoe);
    for (const event of round.events) {
      await sleep(280);
      if (event.kind === 'dealer') setDealer(old => [...old, event.card]);
      else setHands(old => old.map(hand => hand.spot === event.spot ? { ...hand, cards: [...hand.cards, event.card] } : hand));
      if (!(event.kind === 'dealer' && event.hidden)) countCards(event.card);
      buzz();
    }
    setHands(round.hands); setDealer(round.dealer);
    if (round.dealer[0].rank === 'A') { setPhase('insurance'); setMessage('INSURANCE?'); return; }
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
      countCards(next.card);
      setHands(updated); setShoe(next.shoe);
      if (handTotal(updated[active].cards).total >= 21) { await sleep(300); return advance(updated, next.shoe, active); }
      setPhase('playing'); return;
    }
    if (action === 'D' && bankroll >= current.bet) {
      setPhase('dealing'); setBankroll(value => value - current.bet);
      const next = draw(shoe); const updated = hands.map((hand, i) => i === active ? { ...hand, bet: hand.bet * 2, doubled: true, cards: [...hand.cards, next.card] } : hand);
      countCards(next.card);
      setHands(updated); setShoe(next.shoe); await sleep(350); return advance(updated, next.shoe, active);
    }
    if (action === 'P' && bankroll >= current.bet && canSplit(current, rules, handsAtSpot(current))) {
      setPhase('dealing'); setBankroll(value => value - current.bet);
      const aces = current.cards[0].rank === 'A';
      const left: GameHand = { ...current, id: uid(), cards: [current.cards[0]], fromSplit: true, splitAces: aces, doubled: false, surrendered: false };
      const right: GameHand = { ...current, id: uid(), cards: [current.cards[1]], fromSplit: true, splitAces: aces, doubled: false, surrendered: false };
      let next = draw(shoe); left.cards.push(next.card); await sleep(280); next = draw(next.shoe); right.cards.push(next.card);
      countCards(left.cards[left.cards.length - 1], right.cards[right.cards.length - 1]);
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
  const addPracticeChips = (amount: number) => {
    if (!addBankroll(amount)) return;
    setBankroll(value => value + amount);
    setTopUpOpen(false);
  };
  const end = () => { endingRef.current = true; const id = endSession(bankroll); router.replace(id ? `/report/${id}` : '/'); };

  const insuranceStake = hands.filter(hand => !hand.fromSplit).reduce((sum, hand) => sum + hand.bet, 0) / 2;
  const canD = !!current && bankroll >= current.bet && canDouble(current, rules);
  const canP = !!current && bankroll >= current.bet && canSplit(current, rules, handsAtSpot(current));
  const canR = !!current && current.cards.length === 2 && !current.fromSplit && rules.surrender === 'late';
  const decksRemaining = Math.ceil(shoe.length / 52);
  const unseenCards = shoe.length + (dealer[1] && phase !== 'settled' ? 1 : 0);
  const currentTrueCount = trueCount(runningCount, unseenCards);
  const playerEdge = estimatedPlayerEdge(rules, currentTrueCount);
  const hintAction = phase === 'playing' && current && dealer[0]
    ? getBasicStrategy(current.cards.map(cardRankForStrategy), cardRankForStrategy(dealer[0]), rules)
    : undefined;
  const hitStandOdds = phase === 'playing' && current && dealer[0]
    ? estimateHitStandOdds(
        current.cards,
        dealer[0],
        dealer[1] ? [...shoe, dealer[1]] : shoe,
        rules,
      )
    : undefined;
  const displayHands = [...hands].sort((a, b) => (a.spot ?? 0) - (b.spot ?? 0));
  const isCompactTable = Dimensions.get('window').height < 760;

  return (
    <View style={styles.page}>
      <LinearGradient colors={['#163d38', '#0b211f']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.outerVignette} />

      {/* Blackjack Coach header */}
      <View style={[styles.tableHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity testID="end-session" onPress={end} style={styles.headerExit}>
          <Feather name="log-out" size={17} color="#d9c58f" />
        </TouchableOpacity>
        <View style={styles.headerBrand}>
          <Text style={styles.headerBrandMain}>BLACKJACK</Text>
          <Text style={styles.headerBrandSub}>COACH · {decksRemaining} DECKS · {rules.decks * 52 - shoe.length} USED</Text>
        </View>
        <TouchableOpacity
          testID="add-bankroll"
          accessibilityLabel="Add practice chips"
          onPress={() => setTopUpOpen(true)}
          disabled={phase === 'dealing'}
          style={[styles.headerBankroll, phase === 'dealing' && styles.headerBankrollDisabled]}
        >
          <Text style={styles.headerBankrollLabel}>BANKROLL</Text>
          <Text style={styles.headerBankrollValue}>${bankroll.toLocaleString()}</Text>
          <Text style={styles.headerBankrollAdd}>{phase === 'dealing' ? 'DEALING' : 'ADD CHIPS'}</Text>
        </TouchableOpacity>
      </View>

      {/* Table Area */}
      <View style={styles.tableCenter}>
        <View pointerEvents="none" style={styles.tableRail}>
          <View style={styles.tableRailHighlight} />
          <View style={styles.tableFeltInset} />
        </View>
        <View pointerEvents="none" style={styles.feltGrain} />
        <View pointerEvents="none" style={styles.dealerMarker}>
          <View style={styles.dealerMarkerLine} />
          <Text style={styles.dealerMarkerText}>DEALER</Text>
          <View style={styles.dealerMarkerLine} />
        </View>
        <View testID="hint-panel" style={styles.hintPanel}>
          <Text style={styles.hintEyebrow}>BLACKJACK COACH</Text>
          {hintAction && hitStandOdds ? (
            <>
              <View style={styles.hintRecommendation}>
                <Text style={styles.hintLabel}>HINT</Text>
                <Text testID="hint-action" style={styles.hintAction}>{getActionName(hintAction).toUpperCase()}</Text>
              </View>
              <View style={styles.oddsRow}>
                <View><Text style={styles.oddsLabel}>STAND</Text><Text testID="stand-odds" style={styles.oddsValue}>{hitStandOdds.standWin.toFixed(0)}%</Text></View>
                <View style={styles.oddsDivider} />
                <View><Text style={styles.oddsLabel}>HIT ONCE</Text><Text testID="hit-odds" style={styles.oddsValue}>{hitStandOdds.hitWin.toFixed(0)}%</Text></View>
              </View>
              <Text style={styles.oddsNote}>ESTIMATED WIN CHANCE</Text>
            </>
          ) : (
            <Text style={styles.hintWaiting}>{phase === 'settled' ? 'ROUND COMPLETE' : 'HINTS APPEAR AFTER DEAL'}</Text>
          )}
        </View>
        {rules.cardCountingEnabled && (
          <View testID="count-panel" style={styles.countPanel}>
            <Text style={styles.countEyebrow}>HI-LO · LIVE</Text>
            <View style={styles.countRow}>
              <View><Text style={styles.countLabel}>RUNNING</Text><Text testID="running-count" style={styles.countValue}>{runningCount > 0 ? '+' : ''}{runningCount}</Text></View>
              <View style={styles.countDivider} />
              <View><Text style={styles.countLabel}>TRUE</Text><Text testID="true-count" style={styles.countValue}>{currentTrueCount > 0 ? '+' : ''}{currentTrueCount.toFixed(1)}</Text></View>
            </View>
            <Text testID="count-edge" style={[styles.edgeText, playerEdge >= 0 ? styles.playerEdge : styles.houseEdge]}>
              {playerEdge >= 0 ? 'PLAYER' : 'HOUSE'} {Math.abs(playerEdge).toFixed(2)}%
            </Text>
            <Text style={styles.edgeNote}>ESTIMATED EDGE</Text>
          </View>
        )}
         <View style={styles.dealerArea}>
          <View style={styles.cardRow}>
            {dealer.map((card, i) => <CardView key={card.id} card={card} index={i} hidden={i === 1 && phase !== 'settled'} />)}
          </View>
        </View>

         <View style={styles.tableRules}>
          <Text style={styles.rulesMain}>BLACKJACK PAYS 3 TO 2</Text>
          <Text style={styles.rulesSub}>{rules.dealerHitsSoft17 ? 'Dealer must hit on soft 17' : 'Dealer must stand on soft 17'}</Text>
          <View style={styles.rulesRibbon}>
             <View style={styles.ribbonLine} />
             <Text style={styles.rulesInsurance}>INSURANCE 2 TO 1</Text>
             <View style={styles.ribbonLine} />
          </View>
        </View>

        <View style={styles.spotsArea}>
           {phase === 'betting' ? (
               <Animated.View entering={FadeInUp.duration(280)} style={[styles.bettingArc, isCompactTable && styles.bettingArcCompact, singleHandMode && styles.bettingArcSingle]}>
                 <View pointerEvents="none" style={[styles.arcInlay, singleHandMode && styles.arcInlaySingle]}>
                   <View style={[styles.arcCaptionPlate, singleHandMode && styles.arcCaptionPlateSingle]}>
                     <Text style={styles.arcCaption}>{singleHandMode ? 'PLACE YOUR WAGER' : 'SELECT A POSITION · PLACE YOUR WAGER'}</Text>
                   </View>
                 </View>
                 <View style={styles.bettingSpots}>
                   {availableBetSpots.map((bet, i) => {
                     const centered = availableBetSpots.length === 1 || i === 1;
                     return (
                     <TouchableOpacity testID={`bet-spot-${i + 1}`} key={i} activeOpacity={0.82} onPress={() => { setSelectedSpot(i); buzz(); }} style={[styles.betSeat, centered ? styles.betSeatCenter : styles.betSeatOuter, selectedSpot === i && styles.betSeatSelected]}>
                        <View style={[styles.chipWell, centered && styles.chipWellCenter, selectedSpot === i && styles.chipWellSelected]}>
                          <View pointerEvents="none" style={styles.chipWellNotches} />
                         <View style={styles.chipWellInner}>
                           {bet ? <ChipStack amount={bet} size={centered ? 44 : 40} /> : <View style={styles.wellMarker}><Text style={styles.wellNumber}>{i + 1}</Text></View>}
                         </View>
                       </View>
                       {bet > 0 && <View style={styles.seatReadout}>
                         <View style={styles.seatPip} />
                         <Text style={styles.seatText}>${bet}</Text>
                         <View style={styles.seatPip} />
                       </View>}
                     </TouchableOpacity>
                   )})}
                 </View>
              </Animated.View>
          ) : (
             <View style={styles.handsArea}>
                {displayHands.map((hand, index) => {
                   const isActive = hand.id === current?.id && phase === 'playing';
                   return (
                      <View key={hand.id} style={[styles.handWrapper, { zIndex: isActive ? 10 : index, transform: [{ scale: isActive ? 1.15 : 0.9 }], marginTop: hands.length === 1 || (hands.length <= 3 && hand.spot === 2) ? 0 : 25 }]}>
                        <View style={styles.cardRow}>
                           {hand.cards.map((card, i) => <CardView key={card.id} card={card} index={i} />)}
                        </View>
                        <View style={styles.handInfo}>
                           <View style={styles.scoreBubble}>
                             <Text style={styles.scoreText}>{handTotal(hand.cards).total}</Text>
                           </View>
                           <View style={{ height: 6 }} />
                           <Chip amount={hand.bet} size={32} />
                           <Text style={styles.handBetValue}>${hand.bet}</Text>
                           {phase === 'settled' && <Text style={styles.outcomeText}>{hand.outcome}</Text>}
                        </View>
                     </View>
                   )
                })}
             </View>
          )}
        </View>
      </View>

      {/* Bottom Dock Controls */}
       <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
         <View pointerEvents="none" style={styles.dockRailHighlight} />
         {phase === 'betting' && (
            <View style={styles.bettingControls}>
               <View style={styles.chipRack}>
                  {chips.map(amount => (
                     <TouchableOpacity key={amount} testID={`chip-${amount}`} onPress={() => addChip(amount)} disabled={totalBet + amount > bankroll}>
                        <Chip amount={amount} size={48} disabled={totalBet + amount > bankroll} />
                     </TouchableOpacity>
                  ))}
               </View>
               <View style={styles.actionGrid}>
                  <View style={styles.actionRowPrimary}>
                     <ActionButton id="btn-clear" label="Clear" color="grey" icon={<Feather name="x" size={24} color="#fff" />} onPress={() => setBets(old => old.map((b, i) => i === selectedSpot ? 0 : b))} />
                     <ActionButton id="deal-button" label="Deal" color="green" icon={<MaterialCommunityIcons name="cards-playing-outline" size={28} color="#fff" />} onPress={deal} disabled={!totalBet} />
                     <ActionButton id="btn-repeat" label="Repeat" color="blue" icon={<Feather name="refresh-cw" size={24} color="#fff" />} onPress={() => setBets([...lastBets])} disabled={lastBets.reduce((a,b)=>a+b,0) > bankroll} />
                  </View>
               </View>
            </View>
         )}
         {phase === 'insurance' && (
            <View style={styles.actionGrid}>
               <Text style={styles.promptText}>INSURANCE FOR ${insuranceStake}?</Text>
               <View style={styles.actionRowPrimary}>
                  <ActionButton id="insurance-decline" label="No" color="red" icon={<Feather name="x" size={28} color="#fff"/>} onPress={declineInsurance} />
                  <ActionButton id="insurance-take" label="Yes" color="green" icon={<Feather name="check" size={28} color="#fff"/>} onPress={buyInsurance} disabled={bankroll < insuranceStake} />
               </View>
            </View>
         )}
         {phase === 'playing' && (
            <View style={styles.actionGrid}>
               <View style={styles.actionRowSecondary}>
                  {canR && <ActionButton id="action-surrender" label="Surrender" color="grey" size="small" icon={<MaterialCommunityIcons name="flag-variant" size={20} color="#fff"/>} onPress={() => act('R')} />}
                  <ActionButton id="action-split" label="Split" color="yellow" size="small" disabled={!canP} icon={<MaterialCommunityIcons name="arrow-split-vertical" size={20} color="#fff"/>} onPress={() => act('P')} />
               </View>
               <View style={styles.actionRowPrimary}>
                  <ActionButton id="action-stand" label="Stand" color="red" icon={<MaterialCommunityIcons name="hand-back-right" size={26} color="#fff"/>} onPress={() => act('S')} />
                  <ActionButton id="action-double" label="Double" color="blue" disabled={!canD} icon={<FontAwesome5 name="coins" size={22} color="#fff"/>} onPress={() => act('D')} />
                  <ActionButton id="action-hit" label="Hit" color="green" icon={<MaterialCommunityIcons name="arrow-down-bold" size={28} color="#fff"/>} onPress={() => act('H')} disabled={!!current?.splitAces} />
               </View>
            </View>
         )}
         {phase === 'settled' && (
            <View style={styles.actionGrid}>
               <Text style={styles.resultMainText}>{message}</Text>
               {lastNet !== 0 && <Text style={styles.resultNetText}>{lastNet > 0 ? '+' : ''}${lastNet}</Text>}
               <View style={[styles.actionRowPrimary, { marginTop: 12 }]}>
                  <ActionButton id="next-hand" label="Next Round" color="blue" icon={<Feather name="play" size={28} color="#fff"/>} onPress={newHand} />
               </View>
            </View>
         )}
         {phase === 'dealing' && (
            <View style={styles.actionGrid}>
               <Text style={styles.promptText}>DEALING...</Text>
            </View>
         )}
      </View>
      <Modal visible={topUpOpen} transparent animationType="fade" onRequestClose={() => setTopUpOpen(false)}>
        <View style={styles.topUpOverlay}>
          <View style={styles.topUpSheet}>
            <Text style={styles.topUpEyebrow}>PRACTICE BANKROLL</Text>
            <Text style={styles.topUpTitle}>Add chips</Text>
            <Text style={styles.topUpDescription}>Choose an amount to keep practicing. Added chips are tracked separately and never counted as session winnings.</Text>
            <View style={styles.topUpOptions}>
              {[100, 500, 1000].map(amount => (
                <TouchableOpacity key={amount} testID={`bankroll-topup-${amount}`} onPress={() => addPracticeChips(amount)} style={styles.topUpOption}>
                  <Text style={styles.topUpOptionLabel}>+${amount.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity testID="bankroll-topup-cancel" onPress={() => setTopUpOpen(false)} style={styles.topUpCancel}>
              <Text style={styles.topUpCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type ButtonColor = 'red' | 'blue' | 'green' | 'yellow' | 'grey';
function ActionButton({ id, label, color, icon, onPress, disabled, size = 'large' }: {
  id: string;
  label: string;
  color: ButtonColor;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  size?: 'small' | 'large';
}) {
  const isLarge = size === 'large';
  const width = isLarge ? 85 : 70;
  const height = isLarge ? 55 : 45;
  const colors = {
    red: ['#c33633', '#7a1918'],
    blue: ['#2870d4', '#133e80'],
    green: ['#58b43b', '#2c691a'],
    yellow: ['#dfa827', '#936a10'],
    grey: ['#666666', '#333333']
  }[color] as [string, string];

  return (
    <TouchableOpacity testID={id} onPress={onPress} disabled={disabled} style={[styles.btnWrapper, disabled && styles.btnDisabled]}>
      <View style={[styles.btnBody, { width, height }]}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
        <View style={styles.btnHighlight} />
        {icon}
      </View>
      <Text style={styles.btnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b211f' },
  outerVignette: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(1,12,12,0.22)' },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerExit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225,190,119,0.4)',
    backgroundColor: 'rgba(5,19,18,0.76)',
  },
  headerBrand: {
    position: 'absolute',
    left: 70,
    right: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrandMain: {
    fontFamily: 'Inter_700Bold',
    color: '#f5e6c5',
    fontSize: 13,
    letterSpacing: 3,
  },
  headerBrandSub: {
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(225,190,119,0.72)',
    fontSize: 7,
    letterSpacing: 1.1,
    marginTop: 3,
  },
  headerBankroll: {
    minWidth: 88,
    alignItems: 'flex-end',
  },
  headerBankrollDisabled: { opacity: 0.5 },
  headerBankrollLabel: {
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(225,190,119,0.68)',
    fontSize: 7,
    letterSpacing: 1.2,
  },
  headerBankrollValue: {
    fontFamily: 'Inter_700Bold',
    color: '#f5e6c5',
    fontSize: 15,
    marginTop: 1,
  },
  headerBankrollAdd: { fontFamily: 'Inter_700Bold', color: '#e1be77', fontSize: 6, letterSpacing: .8, marginTop: 2 },
  tableCenter: { flex: 1, justifyContent: 'flex-start', marginHorizontal: 7, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  tableRail: { ...StyleSheet.absoluteFill, backgroundColor: '#38281e', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderColor: '#68503a' },
  tableRailHighlight: { position: 'absolute', top: 4, left: 6, right: 6, height: 5, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'rgba(240,203,130,0.25)' },
  tableFeltInset: { position: 'absolute', top: 13, left: 10, right: 10, bottom: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#164b43', borderWidth: 1, borderColor: 'rgba(235,194,112,0.32)' },
  feltGrain: { ...StyleSheet.absoluteFill, opacity: 0.18, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: 'rgba(214,239,203,0.16)', borderStyle: 'dotted' },
  dealerMarker: { position: 'absolute', top: 20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 2 },
  dealerMarkerLine: { width: 24, height: 1, backgroundColor: 'rgba(233,198,124,0.45)' },
  dealerMarkerText: { fontFamily: 'Inter_700Bold', color: 'rgba(242,211,144,0.74)', fontSize: 7, letterSpacing: 2.2 },
  hintPanel: {
    position: 'absolute',
    top: 2,
    left: 14,
    zIndex: 8,
    width: 112,
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(217,197,143,0.42)',
    backgroundColor: 'rgba(8,35,32,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 4,
  },
  hintEyebrow: { color: '#d9c58f', fontFamily: 'Inter_700Bold', fontSize: 6, letterSpacing: .8 },
  hintRecommendation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  hintLabel: { color: 'rgba(243,240,232,0.52)', fontFamily: 'Inter_600SemiBold', fontSize: 6, letterSpacing: .8 },
  hintAction: { color: '#f3f0e8', fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: .7 },
  hintWaiting: { color: 'rgba(243,240,232,0.62)', fontFamily: 'Inter_600SemiBold', fontSize: 7, lineHeight: 10, letterSpacing: .5, marginTop: 7 },
  oddsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  oddsDivider: { width: 1, height: 20, backgroundColor: 'rgba(217,197,143,0.2)' },
  oddsLabel: { color: 'rgba(243,240,232,0.48)', fontFamily: 'Inter_600SemiBold', fontSize: 5, letterSpacing: .5 },
  oddsValue: { color: '#f3f0e8', fontFamily: 'Inter_700Bold', fontSize: 11, marginTop: 1 },
  oddsNote: { color: 'rgba(217,197,143,0.5)', fontFamily: 'Inter_600SemiBold', fontSize: 5, letterSpacing: .45, marginTop: 4 },
  countPanel: {
    position: 'absolute', top: 2, right: 14, zIndex: 8, width: 104,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(217,197,143,0.42)',
    backgroundColor: 'rgba(6,31,14,0.88)', paddingHorizontal: 8, paddingVertical: 6,
  },
  countEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 6, letterSpacing: 1.1, color: '#d9c58f', marginBottom: 5 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countDivider: { width: 1, height: 23, backgroundColor: 'rgba(217,197,143,0.2)' },
  countLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 5, letterSpacing: .7, color: 'rgba(243,240,232,0.55)' },
  countValue: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#f3f0e8', marginTop: 1 },
  edgeText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: .5, marginTop: 5 },
  playerEdge: { color: '#76d88a' },
  houseEdge: { color: '#e58b82' },
  edgeNote: { fontFamily: 'Inter_600SemiBold', fontSize: 5, letterSpacing: .65, color: 'rgba(243,240,232,0.45)', marginTop: 1 },
  dealerArea: {
    alignItems: 'center',
    marginTop: 38,
    minHeight: 110,
    zIndex: 5,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'center', minHeight: 110 },
  tableRules: { alignItems: 'center', marginTop: 10, marginBottom: 8 },
  rulesMain: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#f5e6c5',
    letterSpacing: 1.7,
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  rulesSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(241,230,201,0.74)',
    marginTop: 4,
    marginBottom: 8,
  },
  rulesRibbon: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
   ribbonLine: { flex: 1, height: 1, backgroundColor: 'rgba(225,190,119,0.72)', maxWidth: 40 },
  rulesInsurance: {
    fontFamily: 'Inter_700Bold',
     fontSize: 10,
     color: '#e1be77',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
   spotsArea: { flex: 1, justifyContent: 'flex-end', paddingBottom: 10 },
   bettingArc: { height: 170, justifyContent: 'flex-end', overflow: 'hidden' },
   bettingArcCompact: { height: 154 },
   bettingArcSingle: { alignItems: 'center' },
   arcInlay: {
     position: 'absolute', left: 18, right: 18, bottom: 7, height: 126,
      borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(231,196,121,0.64)',
     borderTopLeftRadius: 180, borderTopRightRadius: 180,
      backgroundColor: 'rgba(5,32,29,0.28)',
   },
    arcInlaySingle: { left: 0, right: 0, height: 124, borderWidth: 0, backgroundColor: 'transparent' },
   arcCaptionPlate: {
      position: 'absolute', top: -14, alignSelf: 'center', paddingHorizontal: 13, paddingVertical: 4,
      borderRadius: 10, backgroundColor: '#123a35', borderWidth: 1, borderColor: 'rgba(225,190,119,0.22)',
   },
    arcCaptionPlateSingle: { top: -14 },
    arcCaption: { fontFamily: 'Inter_700Bold', color: 'rgba(240,213,151,0.92)', fontSize: 8, letterSpacing: 1.1 },
   bettingSpots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, paddingHorizontal: 24, paddingBottom: 16, zIndex: 2 },
   betSeat: { width: 88, alignItems: 'center' },
   betSeatOuter: { marginBottom: 2 },
   betSeatCenter: { marginBottom: 18 },
   betSeatSelected: { transform: [{ translateY: -3 }] },
   chipWell: {
      width: 66, height: 66, borderRadius: 33, padding: 4, backgroundColor: 'rgba(4,29,27,0.78)',
      borderWidth: 2, borderColor: 'rgba(231,196,121,0.62)', shadowColor: '#06180a',
     shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 4, elevation: 4,
   },
    chipWellCenter: { width: 78, height: 78, borderRadius: 39, padding: 6 },
    chipWellSelected: { borderColor: '#f0ce77', backgroundColor: 'rgba(16,61,53,0.96)', shadowColor: '#dfb75a', shadowOpacity: 0.28, shadowRadius: 6, elevation: 7 },
    chipWellNotches: { ...StyleSheet.absoluteFill, borderRadius: 33, borderWidth: 3, borderColor: 'rgba(247,226,172,0.18)', borderStyle: 'dashed' },
    chipWellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.16)' },
   wellMarker: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
   wellNumber: { fontFamily: 'Inter_700Bold', fontSize: 9, color: 'rgba(235,209,137,0.62)' },
   seatReadout: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, height: 16 },
   seatPip: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(235,209,137,0.55)' },
   seatText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.7, color: '#ebd189', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  handsArea: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  handWrapper: { alignItems: 'center' },
  handInfo: { alignItems: 'center', marginTop: 8 },
  scoreBubble: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  scoreText: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 12 },
  handBetValue: {
    fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 14, marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  outcomeText: {
    fontFamily: 'Inter_700Bold', color: '#ebd189', fontSize: 12, marginTop: 4, textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
   bottomDock: { width: '100%', paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#33251e', borderTopWidth: 2, borderTopColor: '#72563d' },
   dockRailHighlight: { position: 'absolute', top: 2, left: 20, right: 20, height: 2, backgroundColor: 'rgba(241,204,130,0.38)' },
  bettingControls: { alignItems: 'center', paddingTop: 10 },
   chipRack: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 17 },
  actionGrid: { alignItems: 'center', minHeight: 80, justifyContent: 'center' },
  actionRowPrimary: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  actionRowSecondary: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
  btnWrapper: { alignItems: 'center', marginHorizontal: 4 },
  btnDisabled: { opacity: 0.4 },
  btnBody: {
     borderRadius: 9, borderWidth: 2, borderColor: '#e7c479', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5,
  },
  btnHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.15)' },
  btnLabel: {
    fontFamily: 'Inter_700Bold', fontStyle: 'italic', fontSize: 14, color: '#fff', marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  promptText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#ebd189', marginBottom: 16, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  resultMainText: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#ebd189', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  resultNetText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  topUpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  topUpSheet: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(217,197,143,0.48)', backgroundColor: '#0b2e17', padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: .55, shadowRadius: 20, elevation: 14 },
  topUpEyebrow: { fontFamily: 'Inter_700Bold', color: '#d9c58f', fontSize: 9, letterSpacing: 1.4 },
  topUpTitle: { fontFamily: 'Inter_700Bold', color: '#f3f0e8', fontSize: 27, marginTop: 7 },
  topUpDescription: { fontFamily: 'Inter_400Regular', color: 'rgba(243,240,232,0.68)', fontSize: 13, lineHeight: 19, marginTop: 7 },
  topUpOptions: { flexDirection: 'row', gap: 9, marginTop: 20 },
  topUpOption: { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: '#d9b863', backgroundColor: 'rgba(217,184,99,0.13)', alignItems: 'center', justifyContent: 'center' },
  topUpOptionLabel: { fontFamily: 'Inter_700Bold', color: '#f3f0e8', fontSize: 14 },
  topUpCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  topUpCancelText: { fontFamily: 'Inter_700Bold', color: 'rgba(243,240,232,0.58)', fontSize: 11, letterSpacing: 1.1 },
});
