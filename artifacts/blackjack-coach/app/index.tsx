import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, Pressable } from 'react-native';
import { useCoach, getSessionStats } from '@/lib/context';
import { useColors } from '@/hooks/useColors';
import { Stack, useRouter } from 'expo-router';
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

const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return '#D4AF37';
  if (grade === 'B') return '#4A90E2';
  if (grade === 'C') return '#F5A623';
  return '#E63946';
};

const SessionRow = ({ item, index, router }: any) => {
  const stats = getSessionStats(item);
  const gradeColor = getGradeColor(stats.grade);
  
  const enterVal = useSharedValue(0);
  useEffect(() => {
    enterVal.value = withDelay(100 + index * 50, withSpring(1, { damping: 15, stiffness: 150 }));
  }, [index, enterVal]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: enterVal.value,
    transform: [{ translateY: interpolate(enterVal.value, [0, 1], [20, 0]) }]
  }));

  return (
    <Animated.View style={entranceStyle}>
      <AnimatedPressable
        style={styles.sessionRow}
        onPress={() => router.push(`/report/${item.id}`)}
      >
        <View>
          <Text style={styles.sessionDateText}>
            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
          <Text style={styles.sessionHandsText}>{item.hands.length} hands</Text>
        </View>
        <View style={styles.sessionRight}>
          <Text style={styles.sessionAccText}>{Math.round(stats.accuracy * 100)}%</Text>
          <View style={[styles.sessionGradeBox, { backgroundColor: gradeColor }]}>
            <Text style={[styles.sessionGradeText, { color: stats.grade.startsWith('A') ? '#000' : '#FFF' }]}>{stats.grade}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

export default function DashboardScreen() {
  const { history, startSession } = useCoach();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleStart = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    startSession();
    router.push('/session');
  };

  const overallDecisions = history.flatMap(s => s.hands.flatMap(h => h.decisions));
  const totalD = overallDecisions.length;
  const correctD = overallDecisions.filter(d => d.isCorrect).length;
  const acc = totalD === 0 ? 0 : Math.round((correctD / totalD) * 100);
  const totalHands = history.reduce((sum, s) => sum + s.hands.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Background Decor */}
      <View style={styles.tableRing1} pointerEvents="none" />
      <View style={styles.tableRing2} pointerEvents="none" />

      <FlatList
        data={history}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'web' ? 34 : 0) }
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
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
            </View>

            <View style={styles.statsContainer}>
               <View style={styles.statBox}>
                  <Text style={styles.statLabel}>OVERALL ACCURACY</Text>
                  <Text style={styles.statValue}>{acc}%</Text>
               </View>
               <View style={styles.statDivider} />
               <View style={styles.statBox}>
                  <Text style={styles.statLabel}>HANDS LOGGED</Text>
                  <Text style={styles.statValue}>{totalHands}</Text>
               </View>
            </View>

            <Text style={styles.sectionTitle}>TABLE HISTORY</Text>
            {history.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialCommunityIcons name="cards" size={32} color="rgba(255,255,255,0.6)" />
                </View>
                <Text style={styles.emptyText}>The table is open</Text>
                <Text style={styles.emptySub}>Take a seat and play your first session to receive personalized feedback.</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <SessionRow item={item} index={index} router={router} />
        )}
      />
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
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    marginBottom: 16,
    paddingLeft: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sessionDateText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sessionHandsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionGradeBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  sessionGradeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  sessionAccText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  }
});