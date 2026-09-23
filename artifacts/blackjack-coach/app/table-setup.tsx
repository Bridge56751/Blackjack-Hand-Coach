import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoach } from '@/lib/context';
import { DEFAULT_TABLE_RULES, DoubleRule, getHiLoIndexSupport, normalizeTableRules, SurrenderRule, TABLE_PRESETS, TableRules } from '@/lib/rules';
import { useColors } from '@/hooks/useColors';

const deckOptions: TableRules['decks'][] = [1, 2, 4, 6, 8];

const presetDescriptions: Record<string, string> = {
  'Vegas 6 Deck': 'Six decks · dealer stands on soft 17 · late surrender',
  'Strip 6 Deck': 'Six decks · dealer hits soft 17 · late surrender',
  'Double Deck': 'Two decks · S17 · NDAS · no surrender',
  'Single Deck': 'One deck · dealer stands on soft 17 · no surrender',
};

export default function TableSetupScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ accuracyMode?: string }>();
  const insets = useSafeAreaInsets();
  const { startSession, preferredRules, preferredRulesReady } = useCoach();
  const [rules, setRules] = useState<TableRules>(DEFAULT_TABLE_RULES);
  const [rulesReady, setRulesReady] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const actionHeight = 76 + Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 12);
  const indexSupport = getHiLoIndexSupport(rules);

  useEffect(() => {
    if (!preferredRulesReady || rulesReady) return;
    setRules(normalizeTableRules({
      ...preferredRules,
      accuracyMode: params.accuracyMode === 'hilo-index'
        ? 'hilo-index'
        : params.accuracyMode === 'basic'
          ? 'basic'
          : preferredRules.accuracyMode,
    }));
    setRulesReady(true);
  }, [params.accuracyMode, preferredRules, preferredRulesReady, rulesReady]);

  const update = <K extends keyof TableRules>(key: K, value: TableRules[K]) =>
    setRules(current => {
      const next = { ...current, name: 'Custom Table', [key]: value };
      return normalizeTableRules(next);
    });
  const selectPreset = (preset: TableRules) => setRules(normalizeTableRules({
    ...preset,
    accuracyMode: rules.accuracyMode,
    cardCountingEnabled: rules.cardCountingEnabled
  }));
  const start = () => {
    startSession(rules);
    router.replace('/session');
  };
  const summary = useMemo(() => [
    `${rules.decks} ${rules.decks === 1 ? 'deck' : 'decks'}`,
    rules.dealerHitsSoft17 ? 'Dealer hits soft 17' : 'Dealer stands on soft 17',
    doubleLabel(rules.doubleRule),
    rules.surrender === 'late' ? 'Late surrender available' : 'No surrender',
    rules.multipleHandsEnabled ? 'Up to three hands per round' : 'One hand per round',
    rules.cardCountingEnabled ? 'Live Hi-Lo counter enabled' : 'Card counting display off',
    rules.accuracyMode === 'hilo-index' ? 'Graded on Hi-Lo Index play' : 'Graded on Basic Strategy',
  ], [rules]);

  if (!rulesReady) {
    return <View style={[styles.page, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View pointerEvents="none" style={[styles.tableArc, { borderColor: colors.border }]} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 18) + webTopInset, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            testID="table-setup-back"
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.brand, { color: colors.primary }]}>BLACKJACK COACH</Text>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>PRACTICE TABLE</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Set Up Your Table</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Match the casino rules you want to practice. Your coaching will use this exact table.
        </Text>

        <SectionLead label="START WITH A PRESET" title="Pick the closest casino table" colors={colors} />
        <View style={styles.presetList}>
          {TABLE_PRESETS.map(preset => {
            const selected = rules.name === preset.name;
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

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(212,175,55,0.16)' }]}>
              <Feather name="check" size={15} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.summaryOverline, { color: colors.primary }]}>YOUR TABLE, IN PLAIN ENGLISH</Text>
              <Text style={[styles.summaryName, { color: colors.foreground }]}>{rules.name}</Text>
            </View>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          {summary.map((item, index) => (
            <View key={item} style={styles.summaryLine}>
              <Text style={[styles.summaryNumber, { color: colors.primary }]}>{`0${index + 1}`}</Text>
              <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>{item}</Text>
            </View>
          ))}
        </View>

        <SectionLead label="FINE-TUNE THE RULES" title="Manual table settings" colors={colors} />

        <RuleSection title="Shoe" description="How many decks are in the dealer's shoe." colors={colors}>
          <View style={styles.deckRow}>
            {deckOptions.map(deck => (
              <DeckChip key={deck} deck={deck} selected={rules.decks === deck} onPress={() => update('decks', deck)} colors={colors} />
            ))}
          </View>
        </RuleSection>

        <RuleSection title="Hands Per Round" description="Choose whether to play one position or several positions at the same table." colors={colors}>
          <RuleChoice
            label="Single hand"
            detail="Play one centered betting position each round."
            selected={rules.multipleHandsEnabled !== true}
            onPress={() => update('multipleHandsEnabled', false)}
            testID="hands-single"
            colors={colors}
          />
          <RuleChoice
            label="Multiple hands"
            detail="Play one, two, or three betting positions in the same round."
            selected={rules.multipleHandsEnabled === true}
            onPress={() => update('multipleHandsEnabled', true)}
            testID="hands-multiple"
            colors={colors}
            last
          />
        </RuleSection>

        <RuleSection title="Dealer Rules" description="What the dealer must do with a soft total of 17." colors={colors}>
          <RuleChoice label="Dealer stands on soft 17" detail="Dealer stops with an ace counted as 11, plus a 6." selected={!rules.dealerHitsSoft17} onPress={() => update('dealerHitsSoft17', false)} testID="dealer-s17" colors={colors} />
          <RuleChoice label="Dealer hits soft 17" detail="Dealer takes another card with an ace-and-6 soft 17." selected={rules.dealerHitsSoft17} onPress={() => update('dealerHitsSoft17', true)} testID="dealer-h17" colors={colors} last />
        </RuleSection>

        <RuleSection title="Player Options" description="Choose the moves the table lets you make." colors={colors}>
          <RuleChoice label="Double on any first two cards" detail="Most flexible doubling rule." selected={rules.doubleRule === 'any-two'} onPress={() => update('doubleRule', 'any-two' as DoubleRule)} testID="double-any-two" colors={colors} />
          <RuleChoice label="Double only on totals of 9–11" detail="You can double with two cards totaling 9, 10, or 11." selected={rules.doubleRule === 'nine-eleven'} onPress={() => update('doubleRule', 'nine-eleven' as DoubleRule)} testID="double-nine-eleven" colors={colors} />
          <RuleChoice label="Double only on totals of 10–11" detail="The most restrictive doubling rule shown here." selected={rules.doubleRule === 'ten-eleven'} onPress={() => update('doubleRule', 'ten-eleven' as DoubleRule)} testID="double-ten-eleven" colors={colors} />
          <RuleChoice label="Double after splitting" detail="Double down after dividing a pair into two hands." selected={rules.doubleAfterSplit} onPress={() => update('doubleAfterSplit', !rules.doubleAfterSplit)} testID="double-after-split" colors={colors} />
          <RuleChoice label="Late surrender" detail="Give up after the dealer checks for blackjack and lose half your bet." selected={rules.surrender === 'late'} onPress={() => update('surrender', rules.surrender === 'late' ? 'none' as SurrenderRule : 'late' as SurrenderRule)} testID="late-surrender" colors={colors} />
          <RuleChoice label="Resplit aces" detail="Split another pair of aces after your first ace split." selected={rules.resplitAces} onPress={() => update('resplitAces', !rules.resplitAces)} testID="resplit-aces" colors={colors} last />
        </RuleSection>

        <RuleSection title="Card Counting" description="Optional live practice aid for learning the Hi-Lo system." colors={colors}>
          <RuleChoice
            label="Show live Hi-Lo count"
            detail="Displays the running count, true count, and estimated player or house edge during play."
            selected={rules.cardCountingEnabled === true}
            onPress={() => update('cardCountingEnabled', !rules.cardCountingEnabled)}
            testID="card-counting-toggle"
            colors={colors}
            last
          />
        </RuleSection>

        <RuleSection title="Accuracy Standard" description="How Blackjack Coach grades your play." colors={colors}>
          <RuleChoice
            label="Basic Strategy"
            detail="Exact rule-specific book play. The standard for learning the game."
            selected={rules.accuracyMode !== 'hilo-index'}
            onPress={() => update('accuracyMode', 'basic')}
            testID="accuracy-basic"
            colors={colors}
          />
          <RuleChoice
            label="Hi-Lo Index Play"
            detail={indexSupport.profile === 'double-deck'
              ? 'Verified Schlesinger Nifty 50 double-deck deviations with floored indices.'
              : 'Count-adjusted H17/S17 multideck deviations, including insurance.'}
            selected={rules.accuracyMode === 'hilo-index'}
            onPress={() => update('accuracyMode', 'hilo-index')}
            testID="accuracy-hilo-index"
            colors={colors}
            disabled={!indexSupport.supported}
            disabledDetail={indexSupport.explanation}
            last
          />
        </RuleSection>

        <RuleSection title="Advanced · Strategy Basis" description="How Blackjack Coach builds your advice." colors={colors}>
          <Text style={[styles.basisText, { color: colors.mutedForeground }]}>
            {rules.accuracyMode === 'hilo-index'
              ? indexSupport.profile === 'double-deck'
                ? 'Coaching grades against rule-correct basic strategy supplemented by Don Schlesinger’s complete Table 31.2 Nifty 50 for 2D S17, NDAS, no surrender, using floored indices. '
                : 'Coaching grades against total-dependent basic strategy supplemented by Blackjack Apprenticeship\'s H17/S17 multideck deviation charts. '
              : 'Coaching grades strictly against total-dependent basic strategy. '
            }
            It accounts for the 3:2 payout, dealer peek, up to four split hands, and one card on split aces. Decks, dealer behavior, doubling, and surrender adjust the chart. Resplitting aces is saved to match your table, but does not change the first-decision chart.
          </Text>
          <Text style={[styles.basisSource, { color: colors.mutedForeground }]}>Strategy method: BlackjackInfo configurable strategy engine.</Text>
        </RuleSection>
        <View aria-hidden style={{ height: actionHeight + 24 }} />
      </ScrollView>

      <View style={[styles.bottomAction, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 12) }]}>
        <TouchableOpacity testID="start-configured-session" onPress={start} style={[styles.startButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.startText, { color: colors.primaryForeground }]}>START SESSION</Text>
          <Feather name="arrow-right" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionLead({ label, title, colors }: { label: string; title: string; colors: any }) {
  return <View style={styles.sectionLead}><Text style={[styles.sectionLabel, { color: colors.primary }]}>{label}</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text></View>;
}

function RuleSection({ title, description, children, colors }: { title: string; description: string; children: ReactNode; colors: any }) {
  return <View style={[styles.ruleSection, { borderTopColor: colors.border }]}><Text style={[styles.ruleTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.ruleDescription, { color: colors.mutedForeground }]}>{description}</Text><View style={styles.ruleContent}>{children}</View></View>;
}

function DeckChip({ deck, selected, onPress, colors }: { deck: TableRules['decks']; selected: boolean; onPress: () => void; colors: any }) {
  return <TouchableOpacity testID={`deck-${deck}`} onPress={onPress} style={[styles.deckChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card }]}><Text style={[styles.deckValue, { color: selected ? colors.primaryForeground : colors.foreground }]}>{deck}</Text><Text style={[styles.deckUnit, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{deck === 1 ? 'DECK' : 'DECKS'}</Text></TouchableOpacity>;
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

function doubleLabel(rule: DoubleRule) {
  if (rule === 'nine-eleven') return 'Double only on totals of 9–11';
  if (rule === 'ten-eleven') return 'Double only on totals of 10–11';
  return 'Double on any first two cards';
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  tableArc: { position: 'absolute', width: 620, height: 620, borderRadius: 310, borderWidth: 1, top: -405, left: -115, opacity: 0.55 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.9 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.45, marginTop: 2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 38, letterSpacing: -0.7, marginTop: 26 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 7, maxWidth: 355 },
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
  summaryCard: { marginTop: 16, borderRadius: 15, borderWidth: 1, padding: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { width: 29, height: 29, borderRadius: 14.5, alignItems: 'center', justifyContent: 'center' },
  summaryOverline: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.05 },
  summaryName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginTop: 3 },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  summaryNumber: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8, width: 28 },
  summaryText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  ruleSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 20, paddingBottom: 2, marginTop: 4 },
  ruleTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: -0.2 },
  ruleDescription: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 4, maxWidth: 350 },
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
  basisText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  basisSource: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 9 },
  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 10 },
  startButton: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  startText: { fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 1 },
});