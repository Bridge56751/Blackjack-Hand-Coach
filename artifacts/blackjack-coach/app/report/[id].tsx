import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCoach, getSessionStats } from '@/lib/context';
import { getActionName } from '@/lib/strategy';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { rulesSummary } from '@/lib/rules';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history } = useCoach();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{session.hands.length} hands played</Text>
               <Text style={[styles.tableName, { color: colors.foreground }]}>{session.rules?.name ?? 'Vegas 6 Deck'}</Text>
               <View style={[styles.rulesPill, { borderColor: colors.border }]}><Text style={[styles.rulesText, { color: colors.primary }]}>{rulesSummary(session.rules)}</Text></View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mistakes to Review</Text>
            {mistakes.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="award" size={40} color={colors.primary} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: colors.foreground }]}>Perfect Session!</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>You made zero basic strategy mistakes.</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.mistakeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.scenarioRow}>
              <View style={styles.scenarioHalf}>
                <Text style={[styles.scenarioLabel, { color: colors.mutedForeground }]}>Dealer Up-Card</Text>
                <View style={[styles.miniCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.miniCardText, { color: colors.foreground }]}>{item.dealerCard}</Text>
                </View>
              </View>
              <View style={styles.scenarioHalf}>
                <Text style={[styles.scenarioLabel, { color: colors.mutedForeground }]}>Your Hand</Text>
                <View style={styles.cardsRow}>
                  {item.playerCards.map((c, i) => (
                    <View key={i} style={[styles.miniCard, { backgroundColor: colors.background, borderColor: colors.border, marginLeft: i > 0 ? -8 : 0 }]}>
                      <Text style={[styles.miniCardText, { color: colors.foreground }]}>{c}</Text>
                    </View>
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
          </View>
        )}
      />
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
  tableName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 12 },
  rulesPill: { marginTop: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  rulesText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
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
  scenarioLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  miniCard: {
    width: 36,
    height: 52,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  miniCardText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  cardsRow: { flexDirection: 'row' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  feedbackRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  feedbackCol: { alignItems: 'center' },
  feedbackLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  feedbackValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
