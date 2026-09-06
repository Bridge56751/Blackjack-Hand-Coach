import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { useCoach, getSessionStats } from '@/lib/context';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent, 
          { paddingTop: 24, paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'web' ? 34 : 0) }
        ]}
        ListHeaderComponent={
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Overall Accuracy</Text>
                  <Text style={[styles.heroValue, { color: colors.foreground }]}>{acc}%</Text>
                </View>
                <View style={styles.heroRight}>
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground, textAlign: 'right' }]}>Hands Logged</Text>
                  <Text style={[styles.heroValue, { color: colors.foreground, textAlign: 'right' }]}>{totalHands}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.startBtn, { backgroundColor: colors.primary }]} 
              onPress={handleStart}
            >
              <Feather name="play" size={20} color={colors.primaryForeground} />
              <Text style={[styles.startBtnText, { color: colors.primaryForeground }]}>Start Session</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Sessions</Text>
            {history.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="clipboard" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
                <Text style={[styles.emptyText, { color: colors.foreground }]}>No sessions logged yet.</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Start a session at the table to get real-time feedback.</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const stats = getSessionStats(item);
          return (
            <TouchableOpacity 
              style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/report/${item.id}`)}
            >
              <View>
                <Text style={[styles.sessionDate, { color: colors.foreground }]}>
                  {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
                <Text style={[styles.sessionSub, { color: colors.mutedForeground }]}>{item.hands.length} hands</Text>
              </View>
              <View style={styles.sessionRight}>
                <Text style={[styles.sessionAcc, { color: colors.foreground }]}>{Math.round(stats.accuracy * 100)}%</Text>
                <View style={[styles.gradeBadge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.gradeText, { color: colors.primary }]}>{stats.grade}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  heroCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroRight: { alignItems: 'flex-end' },
  heroLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  heroValue: { fontSize: 36, fontFamily: 'Inter_700Bold' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 16,
    gap: 12,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', marginBottom: 16 },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  sessionDate: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  sessionSub: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionAcc: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
});
