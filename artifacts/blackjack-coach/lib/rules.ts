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
  showSeatPrompt?: boolean;
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
  showSeatPrompt: true,
  multipleHandsEnabled: false,
  accuracyMode: 'basic',
};

export const TABLE_PRESETS: TableRules[] = [
  DEFAULT_TABLE_RULES,
  { name: 'Strip 6 Deck', decks: 6, dealerHitsSoft17: true, doubleAfterSplit: true, doubleRule: 'any-two', surrender: 'late', resplitAces: true },
  { name: 'Double Deck', decks: 2, dealerHitsSoft17: false, doubleAfterSplit: false, doubleRule: 'any-two', surrender: 'none', resplitAces: false },
  { name: 'Single Deck', decks: 1, dealerHitsSoft17: false, doubleAfterSplit: false, doubleRule: 'any-two', surrender: 'none', resplitAces: false },
];

export type HiLoIndexSupport = {
  supported: boolean;
  profile: 'multideck' | 'double-deck' | null;
  explanation: string;
};

/**
 * One rules-aware source of truth for index grading availability. The existing
 * BJA profile remains scoped to 4/6/8 decks. The double-deck profile is a
 * separate, exact S17/NDAS/no-surrender/double-any-two application.
 */
export function getHiLoIndexSupport(rules?: Partial<TableRules>): HiLoIndexSupport {
  const r = { ...DEFAULT_TABLE_RULES, ...rules };
  if (r.decks === 4 || r.decks === 6 || r.decks === 8) {
    return {
      supported: true,
      profile: 'multideck',
      explanation: 'Blackjack Apprenticeship H17/S17 multideck deviations.',
    };
  }
  if (r.decks === 2) {
    const mismatches: string[] = [];
    if (r.dealerHitsSoft17) mismatches.push('dealer must stand on soft 17');
    if (r.doubleAfterSplit) mismatches.push('double after split must be off');
    if (r.doubleRule !== 'any-two') mismatches.push('doubling must be allowed on any first two cards');
    if (r.surrender !== 'none') mismatches.push('surrender must be unavailable');
    if (mismatches.length === 0) {
      return {
        supported: true,
        profile: 'double-deck',
        explanation: 'Don Schlesinger Table 31.2 Nifty 50: 2D S17, NDAS, no surrender, double any two.',
      };
    }
    return {
      supported: false,
      profile: null,
      explanation: `Verified double-deck indices require S17, NDAS, no surrender, and double any two; ${mismatches.join('; ')}.`,
    };
  }
  return {
    supported: false,
    profile: null,
    explanation: 'No verified Hi-Lo index profile is available for single-deck play.',
  };
}

export function normalizeTableRules(rules?: Partial<TableRules>): TableRules {
  const normalized: TableRules = {
    ...DEFAULT_TABLE_RULES,
    ...rules,
    coachEnabled: rules?.coachEnabled ?? true,
    cardCountingEnabled: rules?.cardCountingEnabled ?? false,
    showSeatPrompt: rules?.showSeatPrompt ?? true,
    multipleHandsEnabled: rules?.multipleHandsEnabled ?? false,
    accuracyMode: rules?.accuracyMode === 'hilo-index' ? 'hilo-index' : 'basic',
  };
  if (normalized.accuracyMode === 'hilo-index' && !getHiLoIndexSupport(normalized).supported) {
    normalized.accuracyMode = 'basic';
  }
  return normalized;
}

export function rulesSummary(rules?: Partial<TableRules>): string {
  const r = normalizeTableRules(rules);
  const double = r.doubleRule === 'any-two' ? 'Double any two' : r.doubleRule === 'nine-eleven' ? 'D9–11' : 'D10–11';
  return `${r.decks}D · ${r.dealerHitsSoft17 ? 'H17' : 'S17'} · ${double} · ${r.doubleAfterSplit ? 'DAS' : 'NDAS'} · ${r.surrender === 'late' ? 'LS' : 'No LS'}`;
}