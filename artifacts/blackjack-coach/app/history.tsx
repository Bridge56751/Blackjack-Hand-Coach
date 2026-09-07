import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, Pressable } from 'react-native';
import { useCoach, getSessionStats } from '@/lib/context';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '@/components/BottomNav';
import { rulesSummary } from '@/lib/rules';

const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return '#D4AF37';
  if (grade === 'B') return '#4A90E2';
  if (grade === 'C') return '#F5A623';
  return '#E63946';
};

const SessionCard = ({ item, router, colors }: any) => {
  const stats = getSessionStats(item);
  const result = (item.bankrollEnd !== undefined && item.bankrollStart !== undefined) 
    ? item.bankrollEnd - item.bankrollStart - (item.bankrollAdded ?? 0)
    : undefined;
    
  return (
    <Pressable style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/report/${item.id}`)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
          <Text style={[styles.handsText, { color: colors.mutedForeground }]}>{item.hands.length} rounds</Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={[styles.accText, { color: colors.foreground }]}>{Math.round(stats.accuracy * 100)}%</Text>
          <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(stats.grade) }]}>
            <Text style={[styles.gradeText, { color: stats.grade.startsWith('A') ? '#000' : '#FFF' }]}>{stats.grade}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
      <View style={styles.cardFooter}>
        <Text style={[styles.rulesText, { color: colors.mutedForeground }]}>{rulesSummary(item.rules)}</Text>
        {result !== undefined && (
          <Text style={[styles.resultText, { color: result >= 0 ? colors.primary : colors.destructive }]}>
            {result >= 0 ? '+' : ''}${result}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

export default function HistoryScreen() {
  const { history } = useCoach();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  
  const [filter, setFilter] = useState<'basic' | 'hilo-index'>('basic');
  
  const filteredHistory = history.filter(session => {
    const stats = getSessionStats(session);
    return stats.mode === filter;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 18) + webTopInset, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Table History</Text>
        
        <View style={[styles.filterContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
          <Pressable
            testID="history-basic-filter"
            style={[styles.filterBtn, filter === 'basic' && { backgroundColor: colors.card }]}
            onPress={() => setFilter('basic')}
          >
            <Text style={[styles.filterText, filter === 'basic' && { color: colors.foreground }]}>Basic Strategy</Text>
          </Pressable>
          <Pressable
            testID="history-count-filter"
            style={[styles.filterBtn, filter === 'hilo-index' && { backgroundColor: colors.card }]}
            onPress={() => setFilter('hilo-index')}
          >
            <Text style={[styles.filterText, filter === 'hilo-index' && { color: colors.foreground }]}>Card Counting</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, webBottomInset) + 80 }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons 
                name={filter === 'basic' ? "book-open-variant" : "cards-playing-outline"} 
                size={32} 
                color={colors.mutedForeground} 
              />
            </View>
            <Text style={[styles.emptyText, { color: colors.foreground }]}>
              No {filter === 'basic' ? 'Basic Strategy' : 'Hi-Lo'} sessions yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {filter === 'basic' 
                ? 'Play a session graded on standard basic strategy to see it here.'
                : 'Play a session graded on card counting indices to see it here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <SessionCard item={item} router={router} colors={colors} />}
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  listContent: {
    padding: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  handsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  gradeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rulesText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  resultText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
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
    fontSize: 17,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  }
});
