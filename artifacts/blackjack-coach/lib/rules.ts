export type DoubleRule = 'any-two' | 'nine-eleven' | 'ten-eleven';
export type SurrenderRule = 'none' | 'late';
export type AccuracyMode = 'basic' | 'hilo-index';

export type TableRules = {
  name: string;
  decks: 1 | 2 | 4 | 6 | 8;
  dealerHitsSoft17: boolean;
  doubleAfterSplit: boolean;
  doubleRule: DoubleRule;
  surrender: SurrenderRule;
  resplitAces: boolean;
  coachEnabled?: boolean;
  cardCountingEnabled?: boolean;
  multipleHandsEnabled?: boolean;
  /** Basic strategy is the safe default for saved sessions created before indices existed. */
  accuracyMode?: AccuracyMode;
};

export const DEFAULT_TABLE_RULES: TableRules = {
  name: 'Vegas 6 Deck',
  decks: 6,
  dealerHitsSoft17: false,
  doubleAfterSplit: true,
  doubleRule: 'any-two',
  surrender: 'late',
  resplitAces: true,
  coachEnabled: true,
  cardCountingEnabled: false,
  multipleHandsEnabled: false,
  accuracyMode: 'basic',
};

export const TABLE_PRESETS: TableRules[] = [
  DEFAULT_TABLE_RULES,
  { name: 'Strip 6 Deck', decks: 6, dealerHitsSoft17: true, doubleAfterSplit: true, doubleRule: 'any-two', surrender: 'late', resplitAces: true },
  { name: 'Double Deck', decks: 2, dealerHitsSoft17: false, doubleAfterSplit: true, doubleRule: 'any-two', surrender: 'late', resplitAces: true },
  { name: 'Single Deck', decks: 1, dealerHitsSoft17: false, doubleAfterSplit: false, doubleRule: 'any-two', surrender: 'none', resplitAces: false },
];

export function normalizeTableRules(rules?: Partial<TableRules>): TableRules {
  const normalized: TableRules = {
    ...DEFAULT_TABLE_RULES,
    ...rules,
    coachEnabled: rules?.coachEnabled ?? true,
    cardCountingEnabled: rules?.cardCountingEnabled ?? false,
    multipleHandsEnabled: rules?.multipleHandsEnabled ?? false,
    accuracyMode: rules?.accuracyMode === 'hilo-index' ? 'hilo-index' : 'basic',
  };
  if ((normalized.decks === 1 || normalized.decks === 2) && normalized.accuracyMode === 'hilo-index') {
    normalized.accuracyMode = 'basic';
  }
  return normalized;
}

export function rulesSummary(rules?: Partial<TableRules>): string {
  const r = normalizeTableRules(rules);
  const double = r.doubleRule === 'any-two' ? 'DAS' : r.doubleRule === 'nine-eleven' ? 'D9–11' : 'D10–11';
  return `${r.decks}D · ${r.dealerHitsSoft17 ? 'H17' : 'S17'} · ${double} · ${r.surrender === 'late' ? 'LS' : 'No LS'}`;
}