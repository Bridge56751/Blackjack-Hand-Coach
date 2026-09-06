import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoach } from '@/lib/context';
import { DoubleRule, normalizeTableRules, SurrenderRule, TABLE_PRESETS, TableRules } from '@/lib/rules';
import { useColors } from '@/hooks/useColors';

const deckOptions: TableRules['decks'][] = [1, 2, 4, 6, 8];

export default function TableSetupScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startSession } = useCoach();
  const [rules, setRules] = useState<TableRules>(normalizeTableRules(TABLE_PRESETS[0]));
  const update = <K extends keyof TableRules>(key: K, value: TableRules[K]) => setRules(current => ({ ...current, name: 'Custom Table', [key]: value }));
  const selectPreset = (preset: TableRules) => setRules(normalizeTableRules(preset));
  const start = () => { startSession(rules); router.replace('/session'); };
  const top = Math.max(insets.top, 18) + (Platform.OS === 'web' ? 56 : 0);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View pointerEvents="none" style={styles.ring} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top, paddingBottom: Math.max(insets.bottom, 24) + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <TouchableOpacity testID="table-setup-back" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={21} color={colors.foreground} /></TouchableOpacity>
          <Text style={[styles.kicker, { color: colors.primary }]}>CHOOSE YOUR CONDITIONS</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Set the table.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your coaching grade will follow these exact house rules.</Text>
        <View style={[styles.basisNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.basisTitle, { color: colors.primary }]}>HOW WE GRADE</Text>
          <Text style={[styles.basisText, { color: colors.mutedForeground }]}>Total-dependent basic strategy for American hole-card/peek blackjack: 3:2, split to four hands, one card on split aces. Decks, H17, DAS, double and surrender rules shape the chart. Resplit aces is saved for table matching, but does not change this initial-decision chart.</Text>
          <Text style={[styles.basisSource, { color: colors.mutedForeground }]}>Source method: BlackjackInfo configurable strategy engine.</Text>
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>HOUSE PRESETS</Text>
        <View style={styles.presetGrid}>
          {TABLE_PRESETS.map(preset => <TouchableOpacity key={preset.name} testID={`preset-${preset.name.toLowerCase().replace(/\s/g, '-')}`} onPress={() => selectPreset(preset)} style={[styles.preset, { borderColor: rules.name === preset.name ? colors.primary : colors.border, backgroundColor: rules.name === preset.name ? 'rgba(212,175,55,0.13)' : colors.card }]}>
            <Text style={[styles.presetName, { color: colors.foreground }]}>{preset.name}</Text>
            <Text style={[styles.presetDetail, { color: colors.mutedForeground }]}>{preset.decks} decks · {preset.dealerHitsSoft17 ? 'H17' : 'S17'}</Text>
          </TouchableOpacity>)}
        </View>

        <RuleCard title="Deck count" colors={colors}>
          <View style={styles.optionRow}>{deckOptions.map(deck => <Chip key={deck} label={`${deck}`} selected={rules.decks === deck} onPress={() => update('decks', deck)} testID={`deck-${deck}`} colors={colors} />)}</View>
        </RuleCard>
        <RuleCard title="Dealer on soft 17" colors={colors}>
          <Choice label="Stand on soft 17" selected={!rules.dealerHitsSoft17} onPress={() => update('dealerHitsSoft17', false)} testID="dealer-s17" colors={colors} />
          <Choice label="Hit soft 17" selected={rules.dealerHitsSoft17} onPress={() => update('dealerHitsSoft17', true)} testID="dealer-h17" colors={colors} />
        </RuleCard>
        <RuleCard title="Double down" colors={colors}>
          <Choice label="Any first two cards" selected={rules.doubleRule === 'any-two'} onPress={() => update('doubleRule', 'any-two' as DoubleRule)} testID="double-any-two" colors={colors} />
          <Choice label="9–11 only" selected={rules.doubleRule === 'nine-eleven'} onPress={() => update('doubleRule', 'nine-eleven' as DoubleRule)} testID="double-nine-eleven" colors={colors} />
          <Choice label="10–11 only" selected={rules.doubleRule === 'ten-eleven'} onPress={() => update('doubleRule', 'ten-eleven' as DoubleRule)} testID="double-ten-eleven" colors={colors} />
        </RuleCard>
        <RuleCard title="Player options" colors={colors}>
          <Choice label="Double after split" selected={rules.doubleAfterSplit} onPress={() => update('doubleAfterSplit', !rules.doubleAfterSplit)} testID="double-after-split" colors={colors} />
          <Choice label="Late surrender" selected={rules.surrender === 'late'} onPress={() => update('surrender', rules.surrender === 'late' ? 'none' as SurrenderRule : 'late' as SurrenderRule)} testID="late-surrender" colors={colors} />
          <Choice label="Resplit aces" selected={rules.resplitAces} onPress={() => update('resplitAces', !rules.resplitAces)} testID="resplit-aces" colors={colors} />
        </RuleCard>
        <TouchableOpacity testID="start-configured-session" onPress={start} style={[styles.start, { backgroundColor: colors.primary }]}><Text style={[styles.startText, { color: colors.primaryForeground }]}>TAKE THIS SEAT</Text><Feather name="arrow-right" size={20} color={colors.primaryForeground} /></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function RuleCard({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) { return <View style={[styles.ruleCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.ruleTitle, { color: colors.mutedForeground }]}>{title}</Text>{children}</View>; }
function Chip({ label, selected, onPress, testID, colors }: { label: string; selected: boolean; onPress: () => void; testID: string; colors: any }) { return <TouchableOpacity testID={testID} onPress={onPress} style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}><Text style={[styles.chipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{label}</Text></TouchableOpacity>; }
function Choice({ label, selected, onPress, testID, colors }: { label: string; selected: boolean; onPress: () => void; testID: string; colors: any }) { return <TouchableOpacity testID={testID} onPress={onPress} style={styles.choice}><Text style={[styles.choiceText, { color: colors.foreground }]}>{label}</Text><View style={[styles.radio, { borderColor: selected ? colors.primary : colors.mutedForeground }]}>{selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}</View></TouchableOpacity>; }
const styles = StyleSheet.create({ page:{flex:1}, ring:{position:'absolute',width:620,height:620,borderRadius:310,borderWidth:1,borderColor:'rgba(255,255,255,0.07)',top:-340,left:-110},content:{paddingHorizontal:20},topline:{flexDirection:'row',alignItems:'center',gap:14},back:{padding:8,marginLeft:-8},kicker:{fontFamily:'Inter_700Bold',letterSpacing:1.6,fontSize:11},title:{fontFamily:'Inter_700Bold',fontSize:36,letterSpacing:-1,marginTop:18},subtitle:{fontFamily:'Inter_400Regular',fontSize:15,lineHeight:22,marginTop:6,marginBottom:14},basisNote:{borderWidth:1,borderRadius:12,padding:14,marginBottom:28},basisTitle:{fontFamily:'Inter_700Bold',fontSize:11,letterSpacing:1.2,marginBottom:6},basisText:{fontFamily:'Inter_400Regular',fontSize:12,lineHeight:18},basisSource:{fontFamily:'Inter_500Medium',fontSize:11,lineHeight:16,marginTop:7},section:{fontFamily:'Inter_700Bold',fontSize:12,letterSpacing:1.5,marginBottom:12},presetGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:24},preset:{width:'48%',padding:14,borderWidth:1,borderRadius:12},presetName:{fontFamily:'Inter_600SemiBold',fontSize:14},presetDetail:{fontFamily:'Inter_400Regular',fontSize:12,marginTop:4},ruleCard:{borderWidth:1,borderRadius:14,padding:16,marginBottom:12},ruleTitle:{fontFamily:'Inter_600SemiBold',fontSize:12,letterSpacing:1,textTransform:'uppercase',marginBottom:10},optionRow:{flexDirection:'row',gap:7},chip:{flex:1,height:40,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center'},chipText:{fontFamily:'Inter_700Bold',fontSize:14},choice:{height:42,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},choiceText:{fontFamily:'Inter_500Medium',fontSize:15},radio:{width:20,height:20,borderRadius:10,borderWidth:2,alignItems:'center',justifyContent:'center'},radioDot:{width:10,height:10,borderRadius:5},start:{height:58,borderRadius:29,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:10,marginTop:12},startText:{fontFamily:'Inter_700Bold',fontSize:16,letterSpacing:.6} });