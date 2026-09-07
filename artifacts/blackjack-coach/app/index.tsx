import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Modal } from 'react-native';
import { useCoach, getSessionStats } from '@/lib/context';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  interpolate 
} from 'react-native-reanimated';
import { getOnboardingRecord } from '@/lib/onboarding';
import { BottomNav } from '@/components/BottomNav';
import { normalizeTableRules } from '@/lib/rules';
import { useSubscription } from '@/lib/subscription';

const AnimatedPressable = ({ onPress, style, children, testID }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Pressable
      testID={testID}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 20, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const PlayingCard = ({ rank, suitIcon, isRed, animatedStyle, zIndex }: any) => {
  const color = isRed ? '#E63946' : '#111111';
  
  return (
    <Animated.View style={[styles.playingCard, animatedStyle, { zIndex }]}>
      <View style={styles.cardCorner}>
        <Text style={[styles.cardRank, { color }]}>{rank}</Text>
        <MaterialCommunityIcons name={suitIcon as any} size={16} color={color} />
      </View>
      <View style={styles.cardCenter}>
        <MaterialCommunityIcons name={suitIcon as any} size={48} color={color} />
      </View>
      <View style={[styles.cardCorner, styles.cardCornerBottom]}>
        <Text style={[styles.cardRank, { color }]}>{rank}</Text>
        <MaterialCommunityIcons name={suitIcon as any} size={16} color={color} />
      </View>
    </Animated.View>
  );
};

function HeroCards() {
  const enterVal = useSharedValue(0);

  useEffect(() => {
    enterVal.value = withDelay(150, withSpring(1, { damping: 14, stiffness: 100 }));
  }, []);

  const card1Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: interpolate(enterVal.value, [0, 1], [-80, -35]) },
        { translateY: interpolate(enterVal.value, [0, 1], [100, 10]) },
        { rotate: `${interpolate(enterVal.value, [0, 1], [-45, -15])}deg` },
      ]
    };
  });

  const card2Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: interpolate(enterVal.value, [0, 1], [80, 25]) },
        { translateY: interpolate(enterVal.value, [0, 1], [100, 20]) },
        { rotate: `${interpolate(enterVal.value, [0, 1], [45, 12])}deg` },
      ]
    };
  });

  return (
    <View style={styles.heroCardsWrapper}>
      <PlayingCard rank="J" suitIcon="cards-heart" isRed={true} animatedStyle={card1Style} zIndex={1} />
      <PlayingCard rank="A" suitIcon="cards-spade" isRed={false} animatedStyle={card2Style} zIndex={2} />
    </View>
  );
}

export default function DashboardScreen() {
  const { history, preferredRules, preferredRulesReady, startSession, updatePreferredRules } = useCoach();
  const { isHighRoller, openPaywall } = useSubscription();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [countAccuracyOverride, setCountAccuracyOverride] = useState<boolean | null>(null);
  const [seatPrompt, setSeatPrompt] = useState<'coach' | 'count' | null>(null);
  const [pendingCoachEnabled, setPendingCoachEnabled] = useState(true);
  const supportsHiLo = preferredRules.decks === 4 || preferredRules.decks === 6 || preferredRules.decks === 8;
  const countAdjustedAccuracy = isHighRoller && supportsHiLo
    && (countAccuracyOverride ?? preferredRules.accuracyMode === 'hilo-index');

  useEffect(() => {
    let mounted = true;
    getOnboardingRecord().then(record => {
      if (!mounted) return;
      if (!record) {
        router.replace('/onboarding');
        return;
      }
      setOnboardingReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleStart = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (preferredRules.showSeatPrompt === false) {
      startSession(normalizeTableRules({
        ...preferredRules,
        accuracyMode: countAdjustedAccuracy ? 'hilo-index' : 'basic',
        cardCountingEnabled: isHighRoller && preferredRules.cardCountingEnabled === true,
      }));
      router.push('/session');
      return;
    }
    setSeatPrompt('coach');
  };

  const beginSession = (coachEnabled: boolean, showCount: boolean) => {
    startSession(normalizeTableRules({
      ...preferredRules,
      accuracyMode: countAdjustedAccuracy ? 'hilo-index' : 'basic',
      coachEnabled,
      cardCountingEnabled: isHighRoller && showCount,
    }));
    setSeatPrompt(null);
    router.push('/session');
  };

  const chooseCoach = (coachEnabled: boolean) => {
    if (isHighRoller && countAdjustedAccuracy) {
      setPendingCoachEnabled(coachEnabled);
      setSeatPrompt('count');
      return;
    }
    beginSession(coachEnabled, preferredRules.cardCountingEnabled === true);
  };

  const selectedMode = countAdjustedAccuracy ? 'hilo-index' : 'basic';
  const selectedHistory = history.filter(session => getSessionStats(session).mode === selectedMode);
  const overallDecisions = selectedHistory.flatMap(s => s.hands.flatMap(h => h.decisions));
  const totalD = overallDecisions.length;
  const correctD = overallDecisions.filter(d => d.isCorrect).length;
  const acc = totalD === 0 ? 0 : Math.round((correctD / totalD) * 100);
  const totalHands = selectedHistory.reduce((sum, s) => sum + s.hands.length, 0);

  if (!onboardingReady || !preferredRulesReady) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Decor */}
      <View style={styles.tableRing1} pointerEvents="none" />
      <View style={styles.tableRing2} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'web' ? 34 : 0) + 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>BLACKJACK</Text>
          <Text style={styles.brandSubtitle}>COACH</Text>
        </View>

        <View style={styles.heroSection}>
          <HeroCards />
          <View style={styles.ctaWrapper}>
            <AnimatedPressable style={styles.ctaBtn} onPress={handleStart} testID="start-session-btn">
              <Text style={styles.ctaText}>TAKE A SEAT</Text>
              <Feather name="arrow-right" size={20} color="#000" />
            </AnimatedPressable>
          </View>
          <Pressable
            testID="home-card-counting-toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: countAdjustedAccuracy }}
            accessibilityLabel="Grade play using card counting"
            onPress={() => {
              if (!supportsHiLo) return;
              if (!isHighRoller) {
                openPaywall('Card Counting');
                return;
              }
              setCountAccuracyOverride(!countAdjustedAccuracy);
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync();
              }
            }}
            style={[styles.countAccuracyToggle, countAdjustedAccuracy && styles.countAccuracyToggleActive]}
          >
            <View style={styles.countAccuracyMainRow}>
              <View style={styles.countAccuracyIcon}>
                <MaterialCommunityIcons name="cards-playing-outline" size={21} color="#D4AF37" />
              </View>
              <View style={styles.countAccuracyCopy}>
                <Text style={styles.countAccuracyTitle}>CARD COUNTING</Text>
                <Text style={styles.countAccuracyDetail}>
                  {!supportsHiLo
                    ? 'Hi-Lo grading requires a 4, 6, or 8-deck shoe'
                    : countAdjustedAccuracy
                      ? 'Accuracy uses Hi-Lo index plays'
                      : isHighRoller
                        ? 'Accuracy uses basic strategy'
                        : 'High Roller unlocks count-adjusted grading'}
                </Text>
              </View>
              {isHighRoller ? (
                <View style={[styles.toggleTrack, countAdjustedAccuracy && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, countAdjustedAccuracy && styles.toggleThumbActive]} />
                </View>
              ) : (
                <Feather name="lock" size={17} color="#D4AF37" />
              )}
            </View>
            {countAdjustedAccuracy && (
              <Text style={styles.countAccuracyDisclaimer}>
                Requires full basic strategy knowledge. Every decision is graded at the Hi-Lo count when you act.
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
           <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {countAdjustedAccuracy ? 'CARD COUNT ACCURACY' : 'BASIC STRATEGY ACCURACY'}
              </Text>
              <Text style={styles.statValue}>{acc}%</Text>
           </View>
           <View style={styles.statDivider} />
           <View style={styles.statBox}>
              <Text style={styles.statLabel}>HANDS LOGGED</Text>
              <Text style={styles.statValue}>{totalHands}</Text>
           </View>
        </View>

        {selectedHistory.length > 0 && (
          <View style={[styles.recentSummary, { borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <Text style={[styles.recentLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>RECENT SESSION</Text>
            <Text style={[styles.recentText, { color: '#FFFFFF' }]}>
              {new Date(selectedHistory[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {selectedHistory[0].hands.length} rounds played
            </Text>
          </View>
        )}
      </ScrollView>
      <BottomNav />
      <Modal
        transparent
        visible={seatPrompt !== null}
        animationType="fade"
        onRequestClose={() => setSeatPrompt(null)}
      >
        <View style={styles.promptBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSeatPrompt(null)} />
          <View style={styles.promptSheet}>
            <View style={styles.promptSuit}>
              <MaterialCommunityIcons
                name={seatPrompt === 'count' ? 'cards-playing-outline' : 'school-outline'}
                size={25}
                color="#D4AF37"
              />
            </View>
            <Text style={styles.promptEyebrow}>BEFORE YOU PLAY</Text>
            <Text style={styles.promptTitle}>
              {seatPrompt === 'count' ? 'Show the live count?' : 'Use Blackjack Coach?'}
            </Text>
            <Text style={styles.promptBody}>
              {seatPrompt === 'count'
                ? 'Choose whether the running count, true count, and estimated edge appear on the table. Your decisions are still graded at the count either way.'
                : 'Choose whether Hit and Stand percentages and the recommended action appear while you play. Every decision is still graded after the session.'}
            </Text>
            <Pressable
              testID="seat-prompt-always-show"
              onPress={() => updatePreferredRules(current => normalizeTableRules({
                ...current,
                showSeatPrompt: current.showSeatPrompt === false,
              }))}
              style={styles.promptPreference}
            >
              <Feather
                name={preferredRules.showSeatPrompt === false ? 'square' : 'check-square'}
                size={18}
                color={preferredRules.showSeatPrompt === false ? 'rgba(255,255,255,0.5)' : '#D4AF37'}
              />
              <View style={styles.promptPreferenceCopy}>
                <Text style={styles.promptPreferenceTitle}>Always show before taking a seat</Text>
                <Text style={styles.promptPreferenceDetail}>Turn off to use your saved Dealer Settings automatically.</Text>
              </View>
            </Pressable>
            <View style={styles.promptActions}>
              {seatPrompt === 'coach' ? (
                <>
                  <Pressable testID="coach-hide" style={styles.promptSecondary} onPress={() => chooseCoach(false)}>
                    <Text style={styles.promptSecondaryText}>PLAY WITHOUT HINTS</Text>
                  </Pressable>
                  <Pressable testID="coach-show" style={styles.promptPrimary} onPress={() => chooseCoach(true)}>
                    <Text style={styles.promptPrimaryText}>SHOW COACH</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable testID="count-hide" style={styles.promptSecondary} onPress={() => beginSession(pendingCoachEnabled, false)}>
                    <Text style={styles.promptSecondaryText}>HIDE COUNT</Text>
                  </Pressable>
                  <Pressable testID="count-show" style={styles.promptPrimary} onPress={() => beginSession(pendingCoachEnabled, true)}>
                    <Text style={styles.promptPrimaryText}>SHOW COUNT</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  tableRing1: {
    position: 'absolute',
    top: -200,
    left: -100,
    right: -100,
    height: 700,
    borderRadius: 350,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  tableRing2: {
    position: 'absolute',
    top: -120,
    left: -20,
    right: -20,
    height: 500,
    borderRadius: 250,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#D4AF37',
    letterSpacing: 6,
    marginTop: 4,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroCardsWrapper: {
    height: 180,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingCard: {
    position: 'absolute',
    width: 120,
    height: 168,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 8,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  cardCorner: {
    alignItems: 'center',
  },
  cardCornerBottom: {
    transform: [{ rotate: '180deg' }],
  },
  cardRank: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  cardCenter: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaWrapper: {
    marginTop: -20,
    zIndex: 10,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#000000',
    letterSpacing: 0.5,
  },
  countAccuracyToggle: {
    width: '100%',
    marginTop: 22,
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  countAccuracyMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  countAccuracyToggleActive: {
    borderColor: 'rgba(212,175,55,0.72)',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  countAccuracyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,175,55,0.12)',
    marginRight: 11,
  },
  countAccuracyCopy: {
    flex: 1,
  },
  countAccuracyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  countAccuracyDetail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  countAccuracyDisclaimer: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
    paddingTop: 6,
    marginLeft: 49,
    paddingRight: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(212,175,55,0.28)',
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginLeft: 10,
  },
  toggleTrackActive: {
    backgroundColor: '#D4AF37',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleThumbActive: {
    backgroundColor: '#092F1D',
    transform: [{ translateX: 18 }],
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  recentSummary: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    alignItems: 'center',
  },
  recentLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  recentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  promptBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  promptSheet: {
    marginHorizontal: 14,
    marginBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.42)',
    backgroundColor: '#0A2B1B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  promptSuit: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.36)',
    backgroundColor: 'rgba(212,175,55,0.1)',
  },
  promptEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: '#D4AF37',
    textAlign: 'center',
    marginBottom: 8,
  },
  promptTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.4,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  promptBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
    marginTop: 9,
  },
  promptPreference: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  promptPreferenceCopy: { flex: 1, marginLeft: 10 },
  promptPreferenceTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  promptPreferenceDetail: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  promptActions: {
    gap: 10,
    marginTop: 22,
  },
  promptPrimary: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
  },
  promptPrimaryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 0.8,
    color: '#07110C',
  },
  promptSecondary: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  promptSecondaryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.7,
    color: 'rgba(255,255,255,0.76)',
  },
});