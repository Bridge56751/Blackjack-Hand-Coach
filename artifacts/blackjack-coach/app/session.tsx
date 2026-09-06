import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useCoach, HandRecord, Decision, getSessionStats } from '@/lib/context';
import { getBasicStrategy, getActionName, Action, getSoftTotal } from '@/lib/strategy';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

const CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'A'];
const ACTIONS: Action[] = ['H', 'S', 'D', 'P', 'R'];

export default function SessionScreen() {
  const { activeSession, endSession, recordHand } = useCoach();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [dealerCard, setDealerCard] = useState<string | null>(null);
  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  
  const [activeSelection, setActiveSelection] = useState<'dealer' | 'player'>('dealer');
  
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctAction: Action; chosenAction: Action } | null>(null);
  const [askingOutcome, setAskingOutcome] = useState(false);

  const { total } = getSoftTotal(playerCards);
  const isBusted = total > 21;

  useEffect(() => {
    if (!activeSession) {
      router.replace('/');
    }
  }, [activeSession]);

  if (!activeSession) return null;

  const currentStats = getSessionStats(activeSession);
  const currentAcc = currentStats.total === 0 ? 100 : Math.round(currentStats.accuracy * 100);

  const handleCardTap = (val: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (feedback || askingOutcome) return; 

    if (activeSelection === 'dealer') {
      setDealerCard(val);
      setActiveSelection('player');
    } else {
      const newCards = [...playerCards, val];
      setPlayerCards(newCards);
      
      const newTotal = getSoftTotal(newCards).total;
      if (newTotal > 21) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAskingOutcome(true);
      }
    }
  };

  const handleAction = (action: Action) => {
    if (!dealerCard || playerCards.length < 2) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const correct = getBasicStrategy(playerCards, dealerCard);
    const isCorrect = action === correct;
    
    const decision: Decision = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      dealerCard,
      playerCards: [...playerCards],
      chosen: action,
      correct,
      isCorrect
    };
    
    setDecisions([...decisions, decision]);
    setFeedback({ isCorrect, correctAction: correct, chosenAction: action });
    
    if (Platform.OS !== 'web') {
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleFeedbackContinue = () => {
    if (!feedback) return;
    const action = feedback.chosenAction;
    setFeedback(null);
    
    if (action === 'H' && !isBusted) {
      setActiveSelection('player');
    } else {
      setAskingOutcome(true);
    }
  };

  const handleOutcome = (outcome: HandRecord['outcome']) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    recordHand({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      decisions,
      outcome
    });
    setDealerCard(null);
    setPlayerCards([]);
    setDecisions([]);
    setAskingOutcome(false);
    setActiveSelection('dealer');
  };

  const onEndSession = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    endSession();
    router.back();
  };

  const canSplit = playerCards.length === 2 && playerCards[0] === playerCards[1];
  const canDouble = playerCards.length === 2;
  const canSurrender = playerCards.length === 2;
  
  const showActions = dealerCard && playerCards.length >= 2 && !isBusted && !feedback && !askingOutcome;
  
  const paddingTop = Math.max(insets.top, 20) + (Platform.OS === 'web' ? 20 : 0);
  const paddingBottom = Math.max(insets.bottom, 24) + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop }]}>
        <TouchableOpacity onPress={onEndSession} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.destructive }]}>End Session</Text>
        </TouchableOpacity>
        <Text style={[styles.headerStats, { color: colors.mutedForeground }]}>
          Hand {activeSession.hands.length + 1}  •  {currentAcc}% Acc
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={false} keyboardShouldPersistTaps="handled">
        
        {/* Table Area */}
        <View style={styles.tableArea}>
          {/* Dealer Card */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Dealer Up-Card</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => !askingOutcome && !feedback && setActiveSelection('dealer')}
              style={[
                styles.cardSlot, 
                { borderColor: colors.border },
                activeSelection === 'dealer' && !askingOutcome && !feedback && { borderColor: colors.primary, borderWidth: 2 }
              ]}
            >
              {dealerCard ? (
                <Animated.View entering={FadeIn.duration(200)} style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.cardText, { color: colors.cardForeground }]}>{dealerCard}</Text>
                </Animated.View>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>Tap to select</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Player Cards */}
          <View style={[styles.section, { marginTop: 32 }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Your Hand</Text>
              {total > 0 && <Text style={[styles.totalText, { color: colors.foreground }]}>{total}</Text>}
            </View>
            <TouchableOpacity 
              activeOpacity={1}
              onPress={() => !askingOutcome && !feedback && setActiveSelection('player')}
              style={[
                styles.playerZone,
                activeSelection === 'player' && !askingOutcome && !feedback && { borderColor: colors.primary, borderWidth: 2 }
              ]}
            >
              {playerCards.length === 0 ? (
                <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>Select cards below</Text>
              ) : (
                <View style={styles.cardsRow}>
                  {playerCards.map((c, i) => (
                    <Animated.View key={i} entering={FadeIn.duration(200)} style={[styles.card, { backgroundColor: colors.card, marginLeft: i > 0 ? -16 : 0 }]}>
                      <Text style={[styles.cardText, { color: colors.cardForeground }]}>{c}</Text>
                    </Animated.View>
                  ))}
                  {isBusted && (
                    <Animated.View entering={FadeIn} style={styles.bustBadge}>
                      <Text style={styles.bustText}>BUST</Text>
                    </Animated.View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Interaction Area */}
        <View style={[styles.interactionArea, { paddingBottom }]}>
          
          {feedback ? (
            <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={[styles.feedbackPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.feedbackHeader}>
                {feedback.isCorrect ? (
                  <Feather name="check-circle" size={32} color={colors.primary} />
                ) : (
                  <Feather name="x-circle" size={32} color={colors.destructive} />
                )}
                <Text style={[styles.feedbackTitle, { color: feedback.isCorrect ? colors.primary : colors.destructive }]}>
                  {feedback.isCorrect ? 'Correct!' : 'Mistake'}
                </Text>
              </View>
              {!feedback.isCorrect && (
                <Text style={[styles.feedbackSub, { color: colors.foreground }]}>
                  Basic strategy says to {getActionName(feedback.correctAction)}.
                </Text>
              )}
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: colors.primary, marginTop: 24 }]} 
                onPress={handleFeedbackContinue}
              >
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : askingOutcome ? (
            <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.outcomePanel}>
              <Text style={[styles.outcomeTitle, { color: colors.foreground }]}>Hand Outcome</Text>
              <View style={styles.outcomeRow}>
                {['Win', 'Loss', 'Push'].map((o) => (
                  <TouchableOpacity 
                    key={o}
                    style={[styles.outcomeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleOutcome(o as HandRecord['outcome'])}
                  >
                    <Text style={[styles.outcomeBtnText, { color: colors.foreground }]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.surrenderLink} onPress={() => handleOutcome('Surrender')}>
                <Text style={[styles.surrenderText, { color: colors.mutedForeground }]}>Surrendered</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : showActions ? (
            <Animated.View entering={SlideInDown} exiting={FadeOut} style={styles.actionsGrid}>
              <View style={styles.actionRow}>
                <ActionBtn action="H" label="Hit" onPress={() => handleAction('H')} colors={colors} />
                <ActionBtn action="S" label="Stand" onPress={() => handleAction('S')} colors={colors} />
              </View>
              <View style={styles.actionRow}>
                <ActionBtn action="D" label="Double" onPress={() => handleAction('D')} colors={colors} disabled={!canDouble} />
                <ActionBtn action="P" label="Split" onPress={() => handleAction('P')} colors={colors} disabled={!canSplit} />
              </View>
              {canSurrender && (
                <TouchableOpacity style={styles.surrenderLink} onPress={() => handleAction('R')}>
                  <Text style={[styles.surrenderText, { color: colors.mutedForeground }]}>Surrender</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.cardInputGrid}>
              <View style={styles.gridRow}>
                {CARD_VALUES.slice(0, 5).map(v => (
                  <CardInputBtn key={v} val={v} onPress={() => handleCardTap(v)} colors={colors} />
                ))}
              </View>
              <View style={styles.gridRow}>
                {CARD_VALUES.slice(5, 10).map(v => (
                  <CardInputBtn key={v} val={v} onPress={() => handleCardTap(v)} colors={colors} />
                ))}
              </View>
              <View style={styles.instructionRow}>
                <Text style={[styles.instructionText, { color: colors.mutedForeground }]}>
                  {activeSelection === 'dealer' ? 'Select Dealer Up-Card' : 'Add Card to Your Hand'}
                </Text>
                {activeSelection === 'player' && dealerCard && (
                  <TouchableOpacity onPress={() => setActiveSelection('dealer')}>
                    <Text style={[styles.switchLink, { color: colors.primary }]}>Edit Dealer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

function CardInputBtn({ val, onPress, colors }: { val: string, onPress: () => void, colors: any }) {
  return (
    <TouchableOpacity 
      style={[styles.inputBtn, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={onPress}
    >
      <Text style={[styles.inputBtnText, { color: colors.cardForeground }]}>{val}</Text>
    </TouchableOpacity>
  );
}

function ActionBtn({ action, label, onPress, colors, disabled }: { action: Action, label: string, onPress: () => void, colors: any, disabled?: boolean }) {
  return (
    <TouchableOpacity 
      style={[
        styles.actionBtn, 
        { backgroundColor: colors.primary },
        disabled && { opacity: 0.3 }
      ]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerBtn: { padding: 8, marginLeft: -8 },
  headerBtnText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  headerStats: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  scrollContent: { flex: 1, justifyContent: 'space-between' },
  tableArea: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center'
  },
  section: { width: '100%', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  cardSlot: {
    width: 72,
    height: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  card: {
    width: 72,
    height: 104,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  cardText: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 32 },
  totalText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  playerZone: {
    minHeight: 120,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 8
  },
  cardsRow: { flexDirection: 'row', alignItems: 'center' },
  bustBadge: {
    position: 'absolute',
    right: -20,
    top: -10,
    backgroundColor: '#E63946',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    transform: [{ rotate: '15deg' }]
  },
  bustText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
  interactionArea: {
    width: '100%',
    paddingHorizontal: 16,
  },
  cardInputGrid: { gap: 8 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  inputBtn: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBtnText: { fontSize: 24, fontFamily: 'Inter_600SemiBold' },
  instructionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 8 },
  instructionText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  switchLink: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  actionsGrid: { gap: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  surrenderLink: { alignSelf: 'center', marginTop: 16, padding: 8 },
  surrenderText: { fontSize: 16, fontFamily: 'Inter_500Medium', textDecorationLine: 'underline' },
  feedbackPanel: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center'
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  feedbackTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  feedbackSub: { fontSize: 16, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  btn: { width: '100%', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  outcomePanel: { gap: 16 },
  outcomeTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 8 },
  outcomeRow: { flexDirection: 'row', gap: 12 },
  outcomeBtn: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  outcomeBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
