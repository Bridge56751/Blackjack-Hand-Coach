import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoach } from '@/lib/context';
import { DoubleRule, normalizeTableRules, SurrenderRule, TABLE_PRESETS, TableRules } from '@/lib/rules';
import { useColors } from '@/hooks/useColors';
import { BottomNav } from '@/components/BottomNav';

const deckOptions: TableRules['decks'][] = [1, 2, 4, 6, 8];

const presetDescriptions: Record<string, string> = {
  'Vegas 6 Deck': 'Six decks · dealer stands on soft 17 · late surrender',
  'Strip 6 Deck': 'Six decks · dealer hits soft 17 · late surrender',
  'Double Deck': 'Two decks · dealer stands on soft 17 · late surrender',
  'Single Deck': 'One deck · dealer stands on soft 17 · no surrender',
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { preferredRules, preferredRulesReady, updatePreferredRules } = useCoach();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const update = <K extends keyof TableRules>(key: K, value: TableRules[K]) => {
    updatePreferredRules(current => {
      const next = { ...current, name: 'Custom Table', [key]: value };
      if (key === 'decks' && (value === 1 || value === 2) && next.accuracyMode === 'hilo-index') {
        next.accuracyMode = 'basic';
      }
      return normalizeTableRules(next);
    });
  };
  
  const selectPreset = (preset: TableRules) => {
    updatePreferredRules(current => normalizeTableRules({
      ...preset,
      accuracyMode: current.accuracyMode,
      cardCountingEnabled: current.cardCountingEnabled,
    }));
  };

  if (!preferredRulesReady) {
    return <View style={[styles.page, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 18) + webTopInset, paddingBottom: Math.max(insets.bottom, webBottomInset) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Dealer Settings</Text>
          <View style={[styles.savedBadge, { backgroundColor: 'rgba(212,175,55,0.12)' }]}>
            <Feather name="check" size={12} color={colors.primary} />
            <Text style={[styles.savedText, { color: colors.primary }]}>Saved automatically</Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Configure your default table rules and preferences. These will be used for new table setups.
        </Text>

        <SectionLead label="TABLE PRESETS" title="Start with a casino standard" colors={colors} />
        <View style={styles.presetList}>
          {TABLE_PRESETS.map(preset => {
            const selected = preferredRules.name === preset.name;
            return (
              <TouchableOpacity
                key={preset.name}
                testID={`preset-${preset.name.toLowerCase().replace(/\s/g, '-')}`}
                onPress={() => selectPreset(preset)}
                style={[
                  styles.preset,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? 'rgba(212,175,55,0.14)' : colors.card,
                  },
                ]}
              >
                <View style={styles.presetCopy}>
                  <Text style={[styles.presetName, { color: colors.foreground }]}>{preset.name}</Text>
                  <Text style={[styles.presetDetail, { color: colors.mutedForeground }]}>{presetDescriptions[preset.name]}</Text>
                </View>
                <View style={[styles.selectionMark, { borderColor: selected ? colors.primary : colors.mutedForeground }]}>
                  {selected && <View style={[styles.selectionDot, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionLead label="FINE-TUNE RULES" title="Manual table settings" colors={colors} />

        <RuleSection title="Shoe" description="How many decks are in the dealer's shoe." colors={colors}>
          <View style={styles.deckRow}>
            {deckOptions.map(deck => (
              <DeckChip key={deck} deck={deck} selected={preferredRules.decks === deck} onPress={() => update('decks', deck)} colors={colors} />
            ))}
          </View>
        </RuleSection>

        <RuleSection title="Hands Per Round" description="Play multiple positions at the same table." colors={colors}>
          <RuleChoice
            label="Single hand"
            detail="Play one centered betting position each round."
            selected={preferredRules.multipleHandsEnabled !== true}
            onPress={() => update('multipleHandsEnabled', false)}
            testID="hands-single"
            colors={colors}
          />
          <RuleChoice
            label="Multiple hands"
            detail="Play up to three betting positions in the same round."
            selected={preferredRules.multipleHandsEnabled === true}
            onPress={() => update('multipleHandsEnabled', true)}
            testID="hands-multiple"
            colors={colors}
            last
          />
        </RuleSection>

        <RuleSection title="Dealer Rules" description="Dealer soft 17 behavior." colors={colors}>
          <RuleChoice label="Dealer stands on soft 17" detail="Stops with an ace counted as 11, plus a 6." selected={!preferredRules.dealerHitsSoft17} onPress={() => update('dealerHitsSoft17', false)} testID="dealer-s17" colors={colors} />
          <RuleChoice label="Dealer hits soft 17" detail="Takes another card with an ace-and-6." selected={preferredRules.dealerHitsSoft17} onPress={() => update('dealerHitsSoft17', true)} testID="dealer-h17" colors={colors} last />
        </RuleSection>

        <RuleSection title="Player Options" description="Available table moves." colors={colors}>
          <RuleChoice label="Double on any first two cards" detail="Most flexible doubling rule." selected={preferredRules.doubleRule === 'any-two'} onPress={() => update('doubleRule', 'any-two' as DoubleRule)} testID="double-any-two" colors={colors} />
          <RuleChoice label="Double only on totals of 9–11" detail="Only with two cards totaling 9, 10, or 11." selected={preferredRules.doubleRule === 'nine-eleven'} onPress={() => update('doubleRule', 'nine-eleven' as DoubleRule)} testID="double-nine-eleven" colors={colors} />
          <RuleChoice label="Double only on totals of 10–11" detail="Most restrictive doubling rule." selected={preferredRules.doubleRule === 'ten-eleven'} onPress={() => update('doubleRule', 'ten-eleven' as DoubleRule)} testID="double-ten-eleven" colors={colors} />
          <RuleChoice label="Double after splitting" detail="Double down after dividing a pair." selected={preferredRules.doubleAfterSplit} onPress={() => update('doubleAfterSplit', !preferredRules.doubleAfterSplit)} testID="double-after-split" colors={colors} />
          <RuleChoice label="Late surrender" detail="Give up after the dealer checks for blackjack." selected={preferredRules.surrender === 'late'} onPress={() => update('surrender', preferredRules.surrender === 'late' ? 'none' as SurrenderRule : 'late' as SurrenderRule)} testID="late-surrender" colors={colors} />
          <RuleChoice label="Resplit aces" detail="Split another pair of aces." selected={preferredRules.resplitAces} onPress={() => update('resplitAces', !preferredRules.resplitAces)} testID="resplit-aces" colors={colors} last />
        </RuleSection>

        <RuleSection title="Card Counting" description="Optional live practice aid." colors={colors}>
          <RuleChoice
            label="Show live Hi-Lo count"
            detail="Displays the running count, true count, and estimated edge during play."
            selected={preferredRules.cardCountingEnabled === true}
            onPress={() => update('cardCountingEnabled', !preferredRules.cardCountingEnabled)}
            testID="settings-card-counting-toggle"
            colors={colors}
            last
          />
        </RuleSection>

        <RuleSection title="Default Accuracy Standard" description="How Blackjack Coach grades your play by default." colors={colors}>
          <RuleChoice
            label="Basic Strategy"
            detail="Exact rule-specific book play. The standard for learning the game."
            selected={preferredRules.accuracyMode !== 'hilo-index'}
            onPress={() => update('accuracyMode', 'basic')}
            testID="settings-accuracy-basic"
            colors={colors}
          />
          <RuleChoice
            label="Hi-Lo Index Play"
            detail="Count-adjusted multideck deviations."
            selected={preferredRules.accuracyMode === 'hilo-index'}
            onPress={() => update('accuracyMode', 'hilo-index')}
            testID="settings-accuracy-hilo"
            colors={colors}
            disabled={preferredRules.decks === 1 || preferredRules.decks === 2}
            disabledDetail="Hi-Lo index mode requires a 4, 6, or 8-deck shoe."
            last
          />
        </RuleSection>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

function SectionLead({ label, title, colors }: { label: string; title: string; colors: any }) {
  return <View style={styles.sectionLead}><Text style={[styles.sectionLabel, { color: colors.primary }]}>{label}</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text></View>;
}

function RuleSection({ title, description, children, colors }: { title: string; description: string; children: React.ReactNode; colors: any }) {
  return <View style={[styles.ruleSection, { borderTopColor: colors.border }]}><Text style={[styles.ruleTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.ruleDescription, { color: colors.mutedForeground }]}>{description}</Text><View style={styles.ruleContent}>{children}</View></View>;
}

function DeckChip({ deck, selected, onPress, colors }: { deck: TableRules['decks']; selected: boolean; onPress: () => void; colors: any }) {
  return <TouchableOpacity testID={`settings-decks-${deck}`} onPress={onPress} style={[styles.deckChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card }]}><Text style={[styles.deckValue, { color: selected ? colors.primaryForeground : colors.foreground }]}>{deck}</Text><Text style={[styles.deckUnit, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{deck === 1 ? 'DECK' : 'DECKS'}</Text></TouchableOpacity>;
}

function RuleChoice({ label, detail, selected, onPress, testID, colors, disabled = false, disabledDetail, last = false }: { label: string; detail: string; selected: boolean; onPress: () => void; testID: string; colors: any; disabled?: boolean; disabledDetail?: string; last?: boolean }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.2}
      style={[styles.choice, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, disabled && { opacity: 0.5 }]}
    >
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.choiceDetail, { color: colors.mutedForeground }]}>{disabled && disabledDetail ? disabledDetail : detail}</Text>
      </View>
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.mutedForeground }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -0.7 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  savedText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  sectionLead: { marginTop: 30, marginBottom: 13 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.45, marginBottom: 5 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.25 },
  presetList: { gap: 9 },
  preset: { minHeight: 76, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  presetCopy: { flex: 1, paddingRight: 10 },
  presetName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  presetDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 4 },
  selectionMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  selectionDot: { width: 10, height: 10, borderRadius: 5 },
  ruleSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 20, paddingBottom: 2, marginTop: 4 },
  ruleTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: -0.2 },
  ruleDescription: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 4 },
  ruleContent: { marginTop: 14 },
  deckRow: { flexDirection: 'row', gap: 7 },
  deckChip: { flex: 1, height: 57, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deckValue: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 20 },
  deckUnit: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.7, marginTop: 2 },
  choice: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  choiceCopy: { flex: 1, paddingRight: 14 },
  choiceLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19 },
  choiceDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});