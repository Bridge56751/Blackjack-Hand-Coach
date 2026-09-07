import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCoach, getSessionStats } from '@/lib/context';
import { getActionName } from '@/lib/strategy';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history } = useCoach();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();

  const session = history.find(s => s.id === id);
  
  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground }}>Session not found.</Text>
      </View>
    );
  }

  const stats = getSessionStats(session);
  const mistakes = stats.decisions.filter(d => !d.isCorrect);
  const bankrollStart = session.bankrollStart ?? 1000;
  const bankrollAdded = session.bankrollAdded ?? 0;
  const bankrollEnd = session.bankrollEnd ?? bankrollStart + bankrollAdded;
  const bankrollResult = bankrollEnd - bankrollStart - bankrollAdded;
  const isIndex = stats.mode === 'hilo-index';
  const bankrollSeries = session.hands.reduce<number[]>(
    (values, hand) => [...values, values[values.length - 1] + (hand.netChange ?? 0)],
    [bankrollStart],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={mistakes}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent, 
          { paddingTop: 24, paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'web' ? 34 : 0) }
        ]}
        ListHeaderComponent={
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.gradeCircle}>
                <Text style={[styles.gradeTextBig, { color: colors.primary }]}>{stats.grade}</Text>
              </View>
              <Text style={[styles.accText, { color: colors.foreground }]}>{Math.round(stats.accuracy * 100)}% Accuracy</Text>
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{stats.correct} / {stats.total} correct decisions</Text>
              {isIndex && (
                <Text style={[styles.detailText, { color: colors.mutedForeground }]}>Basic Strategy match: {Math.round(stats.bookAccuracy * 100)}%</Text>
              )}
               {(session.bankrollStart !== undefined || session.bankrollEnd !== undefined) && <Text style={[styles.detailText, { color: colors.mutedForeground }]}>Bankroll ${bankrollStart}{bankrollAdded ? ` + $${bankrollAdded} added` : ''} → ${bankrollEnd}</Text>}
               <Text style={[styles.resultText, { color: bankrollResult >= 0 ? colors.primary : colors.mutedForeground }]}>Session result {bankrollResult >= 0 ? '+' : ''}${bankrollResult}</Text>
            </View>

            <BankrollChart
              values={bankrollSeries}
              width={Math.min(viewportWidth - 64, 520)}
              cardColor={colors.card}
              borderColor={colors.border}
              foreground={colors.foreground}
              muted={colors.mutedForeground}
              accent={colors.primary}
            />

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mistakes to Review</Text>
            {mistakes.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="award" size={40} color={colors.primary} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: colors.foreground }]}>Perfect Session!</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>You made zero {isIndex ? 'count-adjusted' : 'basic strategy'} mistakes.</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.mistakeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.scenarioRow}>
              <View style={styles.scenarioHalf}>
                <Text numberOfLines={2} style={[styles.scenarioLabel, { color: colors.mutedForeground }]}>{item.spot ? `Spot ${item.spot} · Dealer Up-Card` : 'Dealer Up-Card'}</Text>
                <ReportCard label={item.dealerCardLabel ?? item.dealerCard} />
              </View>
              <View style={styles.scenarioHalf}>
                <Text numberOfLines={2} style={[styles.scenarioLabel, { color: colors.mutedForeground }]}>Your Hand</Text>
                <View style={styles.cardsRow}>
                  {(item.playerCardLabels ?? item.playerCards).map((card, i) => (
                    <ReportCard key={i} label={card} overlapped={i > 0} />
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.feedbackRow}>
              <View style={styles.feedbackCol}>
                <Text style={[styles.feedbackLabel, { color: colors.mutedForeground }]}>You played</Text>
                <Text style={[styles.feedbackValue, { color: colors.destructive }]}>{getActionName(item.chosen)}</Text>
              </View>
              <Feather name="arrow-right" size={20} color={colors.mutedForeground} />
              <View style={styles.feedbackCol}>
                <Text style={[styles.feedbackLabel, { color: colors.mutedForeground }]}>Correct play</Text>
                <Text style={[styles.feedbackValue, { color: colors.primary }]}>{getActionName(item.correct)}</Text>
              </View>
            </View>
            {isIndex && item.gradingMode === 'hilo-index' && (
              <View style={styles.indexContext}>
                <Text style={[styles.indexContextText, { color: colors.mutedForeground }]}>RC: {item.runningCount} · TC: {item.trueCount?.toFixed(1)}</Text>
                {item.explanation && <Text style={[styles.indexContextDesc, { color: colors.mutedForeground }]}>{item.explanation}</Text>}
                {item.basicAction && item.basicAction !== item.correct && (
                  <Text style={[styles.indexContextDesc, { color: colors.mutedForeground, marginTop: 4 }]}>Book play would be {getActionName(item.basicAction)}</Text>
                )}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

function BankrollChart({
  values,
  width,
  cardColor,
  borderColor,
  foreground,
  muted,
  accent,
}: {
  values: number[];
  width: number;
  cardColor: string;
  borderColor: string;
  foreground: string;
  muted: string;
  accent: string;
}) {
  const chartWidth = Math.max(width, 260);
  const chartHeight = 142;
  const insetX = 10;
  const insetY = 14;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = Math.max(high - low, 1);
  const plotWidth = chartWidth - insetX * 2;
  const plotHeight = chartHeight - insetY * 2;
  const points = values.map((value, index) => {
    const x = insetX + (values.length === 1 ? plotWidth / 2 : (index / (values.length - 1)) * plotWidth);
    const y = insetY + ((high - value) / range) * plotHeight;
    return { x, y, value };
  });
  const startY = insetY + ((high - values[0]) / range) * plotHeight;
  const finish = values[values.length - 1];
  const formatMoney = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <View style={[styles.chartCard, { width: chartWidth + 32, backgroundColor: cardColor, borderColor }]}>
      <View style={styles.chartHeading}>
        <View>
          <Text style={[styles.chartEyebrow, { color: accent }]}>BANKROLL JOURNEY</Text>
          <Text style={[styles.chartSubtitle, { color: muted }]}>Session result after each round</Text>
        </View>
        <Text style={[styles.chartFinish, { color: finish >= values[0] ? accent : foreground }]}>{formatMoney(finish)}</Text>
      </View>
      <Svg width={chartWidth} height={chartHeight}>
        <Line x1={insetX} y1={startY} x2={chartWidth - insetX} y2={startY} stroke={muted} strokeOpacity={0.24} strokeDasharray="5 5" />
        <Polyline
          points={points.map(point => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={accent}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <Circle
            key={`${point.x}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === 0 || index === points.length - 1 ? 4 : 2.5}
            fill={cardColor}
            stroke={accent}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={styles.chartStats}>
        <View><Text style={[styles.chartStatLabel, { color: muted }]}>START</Text><Text style={[styles.chartStatValue, { color: foreground }]}>{formatMoney(values[0])}</Text></View>
        <View style={styles.chartStatCenter}><Text style={[styles.chartStatLabel, { color: muted }]}>LOW</Text><Text style={[styles.chartStatValue, { color: foreground }]}>{formatMoney(low)}</Text></View>
        <View style={styles.chartStatCenter}><Text style={[styles.chartStatLabel, { color: muted }]}>HIGH</Text><Text style={[styles.chartStatValue, { color: foreground }]}>{formatMoney(high)}</Text></View>
        <View style={styles.chartStatRight}><Text style={[styles.chartStatLabel, { color: muted }]}>FINISH</Text><Text style={[styles.chartStatValue, { color: foreground }]}>{formatMoney(finish)}</Text></View>
      </View>
    </View>
  );
}

function ReportCard({ label, overlapped = false }: { label: string; overlapped?: boolean }) {
  const last = label.slice(-1);
  const hasSuit = ['♠', '♥', '♦', '♣'].includes(last);
  const suit = hasSuit ? last : '';
  const rank = hasSuit ? label.slice(0, -1) : label === 'T' ? '10' : label;
  const color = suit === '♥' || suit === '♦' ? '#d92534' : '#11181c';

  return (
    <View style={[styles.miniCard, overlapped && styles.miniCardOverlapped]}>
      <View style={styles.miniCardCorner}>
        <Text style={[styles.miniCardRank, { color }]}>{rank}</Text>
        {!!suit && <Text style={[styles.miniCardSuitSmall, { color }]}>{suit}</Text>}
      </View>
      {!!suit && <Text style={[styles.miniCardSuit, { color }]}>{suit}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  heroCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 32,
  },
  gradeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gradeTextBig: { fontSize: 48, fontFamily: 'Inter_700Bold' },
  accText: { fontSize: 24, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  detailText: { fontSize: 16, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  resultText: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 3 },
  chartCard: { alignSelf: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 28 },
  chartHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  chartEyebrow: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  chartSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  chartFinish: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  chartStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartStatCenter: { alignItems: 'center' },
  chartStatRight: { alignItems: 'flex-end' },
  chartStatLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  chartStatValue: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', marginBottom: 16 },
  emptyState: { padding: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  mistakeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  scenarioRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  scenarioHalf: { flex: 1 },
  scenarioLabel: { minHeight: 30, fontSize: 12, lineHeight: 15, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  miniCard: {
    width: 48,
    height: 68,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d4d4d4',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: .22,
    shadowRadius: 3,
    elevation: 3,
  },
  miniCardOverlapped: { marginLeft: 6 },
  miniCardCorner: { position: 'absolute', top: 3, left: 4, width: 18, alignItems: 'center', zIndex: 2 },
  miniCardRank: { fontSize: 15, lineHeight: 15, fontFamily: 'Inter_700Bold', letterSpacing: -.5 },
  miniCardSuitSmall: { fontSize: 11, lineHeight: 11 },
  miniCardSuit: { position: 'absolute', right: 7, bottom: 8, fontSize: 25, opacity: .94 },
  cardsRow: { flexDirection: 'row' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  feedbackRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  feedbackCol: { alignItems: 'center' },
  feedbackLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  feedbackValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  indexContext: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  indexContextText: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, marginBottom: 4 },
  indexContextDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
