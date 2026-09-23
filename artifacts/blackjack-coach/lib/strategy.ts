import fixture from './strategy-fixtures.json' with { type: 'json' };
import { DEFAULT_TABLE_RULES, getHiLoIndexSupport, normalizeTableRules } from './rules.ts';
import type { TableRules } from './rules.ts';

export type Action = 'H' | 'S' | 'D' | 'P' | 'R' | 'I' | 'N';
type StrategyCode = Action | 'd' | 'r' | 'p';
type StrategyTable = Record<string, StrategyCode[]>;
type Strategy = { hard: StrategyTable; soft: StrategyTable; pairs: StrategyTable };

export const FULL_HILO_INDEX_PROFILE_ID = 'blackjack-apprenticeship-h17-s17-deviation-charts-multideck-v1';
/**
 * Exact transcription of Blackjack Apprenticeship's public 2018 H17/S17
 * Deviation Charts. It is deliberately a 4/6/8-deck American-peek
 * profile only: do not use it for one or two decks (their indices differ).
 */
export const FULL_HILO_INDEX_PROFILE = {
  id: FULL_HILO_INDEX_PROFILE_ID,
  version: 1,
  source: 'Blackjack Apprenticeship, H17/S17 Deviation Charts, 2018 public PDFs',
  supportedDecks: [4, 6, 8] as const,
  game: 'American peek',
  unsupported: '1- and 2-deck count indices are not supported; callers must disable hilo-index for those games.',
} as const;

export const DOUBLE_DECK_HILO_INDEX_PROFILE_ID = 'schlesinger-nifty-50-52-104-s17-ndas-v1';
export const DOUBLE_DECK_HILO_INDEX_PROFILE = {
  id: DOUBLE_DECK_HILO_INDEX_PROFILE_ID,
  version: 1,
  source: 'Don Schlesinger, “Master Class: The Hi-Lo Card Counting System,” Casino Player, June 16, 2023, Table 31.2',
  application: 'Nifty 50, 52/104 penetration, S17, NDAS, play-all 1–6',
  indexGeneration: 'Two-deck indices generated at 62/104 penetration; indices are floored',
  rules: '2 decks, S17, NDAS, no surrender, double on any first two cards',
} as const;

type IndexDirection = 'above' | 'at-or-above' | 'below' | 'at-or-below';
type HandKind = 'hard' | 'soft' | 'pair';
export type HiLoIndexRule = {
  kind: HandKind;
  hand: string;
  dealer: string;
  action: Action;
  index: number;
  direction?: IndexDirection;
  surrenderContext?: 'none' | 'late';
  /** Published play on the other side of a double-deck departure index. */
  belowAction?: Action;
};

// The source charts define 0+ as a positive running count and 0- as a negative
// running count. Explicit strict directions preserve those boundaries without
// rounding the true count.
export const FULL_HILO_INDEX_RULES: Record<'h17' | 's17', HiLoIndexRule[]> = {
  s17: [
    { kind: 'pair', hand: 'T,T', dealer: '4', action: 'P', index: 6 }, { kind: 'pair', hand: 'T,T', dealer: '5', action: 'P', index: 5 }, { kind: 'pair', hand: 'T,T', dealer: '6', action: 'P', index: 4 },
    { kind: 'soft', hand: 'A,6', dealer: '2', action: 'D', index: 1 }, { kind: 'soft', hand: 'A,8', dealer: '4', action: 'D', index: 3 }, { kind: 'soft', hand: 'A,8', dealer: '5', action: 'D', index: 1 }, { kind: 'soft', hand: 'A,8', dealer: '6', action: 'D', index: 1 },
    { kind: 'hard', hand: '8', dealer: '6', action: 'D', index: 2, surrenderContext: 'none' }, { kind: 'hard', hand: '9', dealer: '2', action: 'D', index: 1 }, { kind: 'hard', hand: '9', dealer: '7', action: 'D', index: 3 },
    { kind: 'hard', hand: '10', dealer: 'A', action: 'D', index: 4 }, { kind: 'hard', hand: '10', dealer: 'T', action: 'D', index: 4 }, { kind: 'hard', hand: '11', dealer: 'A', action: 'D', index: 1 },
    { kind: 'hard', hand: '12', dealer: '2', action: 'S', index: 3 }, { kind: 'hard', hand: '12', dealer: '3', action: 'S', index: 2 }, { kind: 'hard', hand: '12', dealer: '4', action: 'H', index: 0, direction: 'below' }, { kind: 'hard', hand: '13', dealer: '2', action: 'H', index: -1, direction: 'at-or-below' },
    { kind: 'hard', hand: '15', dealer: 'T', action: 'S', index: 4, surrenderContext: 'none' }, { kind: 'hard', hand: '16', dealer: '9', action: 'S', index: 4, surrenderContext: 'none' }, { kind: 'hard', hand: '16', dealer: 'T', action: 'S', index: 0, direction: 'above', surrenderContext: 'none' },
    { kind: 'hard', hand: '16', dealer: '8', action: 'R', index: 4, surrenderContext: 'late' }, { kind: 'hard', hand: '16', dealer: '9', action: 'H', index: -1, direction: 'at-or-below', surrenderContext: 'late' }, { kind: 'hard', hand: '15', dealer: '9', action: 'R', index: 2, surrenderContext: 'late' }, { kind: 'hard', hand: '15', dealer: 'T', action: 'H', index: 0, direction: 'below', surrenderContext: 'late' }, { kind: 'hard', hand: '15', dealer: 'A', action: 'R', index: 2, surrenderContext: 'late' },
  ],
  h17: [
    { kind: 'pair', hand: 'T,T', dealer: '4', action: 'P', index: 6 }, { kind: 'pair', hand: 'T,T', dealer: '5', action: 'P', index: 5 }, { kind: 'pair', hand: 'T,T', dealer: '6', action: 'P', index: 4 },
    { kind: 'soft', hand: 'A,6', dealer: '2', action: 'D', index: 1 }, { kind: 'soft', hand: 'A,8', dealer: '4', action: 'D', index: 3 }, { kind: 'soft', hand: 'A,8', dealer: '5', action: 'D', index: 1 }, { kind: 'soft', hand: 'A,8', dealer: '6', action: 'S', index: 0, direction: 'below' },
    { kind: 'hard', hand: '8', dealer: '6', action: 'D', index: 2, surrenderContext: 'none' }, { kind: 'hard', hand: '9', dealer: '2', action: 'D', index: 1 }, { kind: 'hard', hand: '9', dealer: '7', action: 'D', index: 3 },
    { kind: 'hard', hand: '10', dealer: 'A', action: 'D', index: 3 }, { kind: 'hard', hand: '10', dealer: 'T', action: 'D', index: 4 },
    { kind: 'hard', hand: '12', dealer: '2', action: 'S', index: 3 }, { kind: 'hard', hand: '12', dealer: '3', action: 'S', index: 2 }, { kind: 'hard', hand: '12', dealer: '4', action: 'H', index: 0, direction: 'below' }, { kind: 'hard', hand: '13', dealer: '2', action: 'H', index: -1, direction: 'at-or-below' },
    { kind: 'hard', hand: '15', dealer: 'T', action: 'S', index: 4, surrenderContext: 'none' }, { kind: 'hard', hand: '15', dealer: 'A', action: 'S', index: 5, surrenderContext: 'none' }, { kind: 'hard', hand: '16', dealer: '9', action: 'S', index: 4, surrenderContext: 'none' }, { kind: 'hard', hand: '16', dealer: 'T', action: 'S', index: 0, direction: 'above', surrenderContext: 'none' }, { kind: 'hard', hand: '16', dealer: 'A', action: 'S', index: 3, surrenderContext: 'none' },
    { kind: 'hard', hand: '16', dealer: '8', action: 'R', index: 4, surrenderContext: 'late' }, { kind: 'hard', hand: '16', dealer: '9', action: 'H', index: -1, direction: 'at-or-below', surrenderContext: 'late' }, { kind: 'hard', hand: '15', dealer: '9', action: 'R', index: 2, surrenderContext: 'late' }, { kind: 'hard', hand: '15', dealer: 'T', action: 'H', index: 0, direction: 'below', surrenderContext: 'late' }, { kind: 'hard', hand: '15', dealer: 'A', action: 'H', index: -1, direction: 'below', surrenderContext: 'late' },
  ],
};

function doubleDeckBelowAction(rule: HiLoIndexRule): Action {
  // Table 31.2 lists departure plays, so using generic basic strategy on the
  // other side is unsafe (many cells' ordinary basic play equals the listed
  // action). Encode the opposite-side play for every class in this table.
  if (rule.kind === 'hard') return 'H';
  if (rule.kind === 'pair') {
    if (rule.hand === 'T,T') return 'S';
    if (rule.hand === '6,6' || rule.hand === '4,4') return 'H';
    throw new Error(`Unhandled double-deck pair departure: ${rule.hand}`);
  }
  if (rule.action === 'S') return 'H'; // A,7 v A
  const softTotal = 11 + Number(rule.hand.split(',')[1]);
  return softTotal >= 18 ? 'S' : 'H';
}

/** Complete 50-row Table 31.2 transcription (insurance is handled separately). */
const DOUBLE_DECK_HILO_INDEX_TRANSCRIPTION: HiLoIndexRule[] = [
  { kind: 'hard', hand: '16', dealer: 'T', action: 'S', index: 1 },
  { kind: 'hard', hand: '12', dealer: '3', action: 'S', index: 3 },
  { kind: 'hard', hand: '15', dealer: 'T', action: 'S', index: 4 },
  { kind: 'pair', hand: 'T,T', dealer: '5', action: 'P', index: 5 },
  { kind: 'pair', hand: 'T,T', dealer: '6', action: 'P', index: 5 },
  { kind: 'hard', hand: '12', dealer: '4', action: 'S', index: 1 },
  { kind: 'hard', hand: '12', dealer: '2', action: 'S', index: 5 },
  { kind: 'hard', hand: '8', dealer: '6', action: 'D', index: 2 },
  { kind: 'hard', hand: '13', dealer: '2', action: 'S', index: 0 },
  { kind: 'hard', hand: '9', dealer: '7', action: 'D', index: 3 },
  { kind: 'hard', hand: '10', dealer: 'A', action: 'D', index: 3 },
  { kind: 'hard', hand: '11', dealer: 'A', action: 'D', index: 0 },
  { kind: 'hard', hand: '8', dealer: '5', action: 'D', index: 4 },
  { kind: 'soft', hand: 'A,8', dealer: '6', action: 'D', index: 1 },
  { kind: 'hard', hand: '12', dealer: '6', action: 'S', index: 0 },
  { kind: 'soft', hand: 'A,8', dealer: '5', action: 'D', index: 1 },
  { kind: 'hard', hand: '12', dealer: '5', action: 'S', index: -1 },
  { kind: 'hard', hand: '16', dealer: '9', action: 'S', index: 5 },
  { kind: 'pair', hand: 'T,T', dealer: '4', action: 'P', index: 7 },
  { kind: 'hard', hand: '13', dealer: '3', action: 'S', index: -1 },
  { kind: 'hard', hand: '9', dealer: '2', action: 'D', index: 1 },
  { kind: 'hard', hand: '10', dealer: 'T', action: 'D', index: 7 },
  { kind: 'soft', hand: 'A,3', dealer: '4', action: 'D', index: 1 },
  { kind: 'pair', hand: '4,4', dealer: '6', action: 'D', index: 2 },
  { kind: 'hard', hand: '13', dealer: '4', action: 'S', index: -3 },
  { kind: 'soft', hand: 'A,8', dealer: '4', action: 'D', index: 3 },
  { kind: 'hard', hand: '14', dealer: '2', action: 'S', index: -3 },
  { kind: 'soft', hand: 'A,7', dealer: '2', action: 'D', index: 0 },
  { kind: 'hard', hand: '10', dealer: '9', action: 'D', index: -2 },
  { kind: 'soft', hand: 'A,2', dealer: '4', action: 'D', index: 3 },
  { kind: 'hard', hand: '9', dealer: '3', action: 'D', index: -1 },
  { kind: 'hard', hand: '11', dealer: 'T', action: 'D', index: -5 },
  { kind: 'pair', hand: '4,4', dealer: '5', action: 'D', index: 4 },
  { kind: 'soft', hand: 'A,9', dealer: '6', action: 'D', index: 5 },
  { kind: 'soft', hand: 'A,9', dealer: '5', action: 'D', index: 5 },
  { kind: 'hard', hand: '8', dealer: '4', action: 'D', index: 6 },
  { kind: 'hard', hand: '15', dealer: '9', action: 'S', index: 8 },
  { kind: 'hard', hand: '16', dealer: 'A', action: 'S', index: 8 },
  { kind: 'pair', hand: 'T,T', dealer: '3', action: 'P', index: 9 },
  { kind: 'hard', hand: '13', dealer: '5', action: 'S', index: -4 },
  { kind: 'hard', hand: '14', dealer: '3', action: 'S', index: -5 },
  { kind: 'soft', hand: 'A,8', dealer: '3', action: 'D', index: 5 },
  { kind: 'soft', hand: 'A,2', dealer: '5', action: 'D', index: -1 },
  { kind: 'hard', hand: '13', dealer: '6', action: 'S', index: -4 },
  { kind: 'hard', hand: '16', dealer: '8', action: 'S', index: 9 },
  { kind: 'pair', hand: '6,6', dealer: '2', action: 'P', index: 1 },
  { kind: 'hard', hand: '9', dealer: '4', action: 'D', index: -3 },
  { kind: 'hard', hand: '15', dealer: '2', action: 'S', index: -6 },
  { kind: 'soft', hand: 'A,7', dealer: 'A', action: 'S', index: -1 },
];

export const DOUBLE_DECK_HILO_INDEX_RULES: HiLoIndexRule[] =
  DOUBLE_DECK_HILO_INDEX_TRANSCRIPTION.map(rule => ({
    ...rule,
    belowAction: doubleDeckBelowAction(rule),
  }));

const strategies = fixture.strategies as Record<string, Strategy>;

function cardRank(card: string): string | null {
  const normalized = card.trim().toUpperCase();
  if (normalized === 'A') return 'A';
  if (normalized === 'T' || normalized === '10' || normalized === 'J' || normalized === 'Q' || normalized === 'K') return 'T';
  return /^[2-9]$/.test(normalized) ? normalized : null;
}

function cardValue(rank: string): number {
  return rank === 'A' ? 11 : rank === 'T' ? 10 : Number(rank);
}

function dealerColumn(card: string): number | null {
  const rank = cardRank(card);
  if (!rank) return null;
  return rank === 'A' ? 9 : rank === 'T' ? 8 : Number(rank) - 2;
}

function strategyFor(rules: TableRules): Strategy {
  const dealer = rules.dealerHitsSoft17 ? 'h17' : 's17';
  const das = rules.doubleAfterSplit ? 'yes' : 'no';
  const double = rules.doubleRule === 'any-two' ? 'all' : rules.doubleRule === 'nine-eleven' ? 'd9' : 'd10';
  const surrender = rules.surrender === 'late' ? 'ls' : 'ns';
  const key = `${rules.decks}-${dealer}-${das}-${double}-${surrender}`;
  const strategy = strategies[key];
  if (!strategy) throw new Error(`No blackjack strategy fixture exists for ${key}.`);
  return strategy;
}

/**
 * The hand entry model records only a current hand, not a split-hand lineage.
 * Consequently resplitAces is deliberately not part of this initial-decision
 * lookup; the fixture's chart dimensions are deck/H17/DAS/double/surrender.
 */
function resolveCode(code: StrategyCode, canDouble: boolean, canSurrender: boolean, canSplit: boolean): Action {
  switch (code) {
    case 'H': case 'S': return code;
    case 'D': return canDouble ? 'D' : 'H';
    case 'd': return canDouble ? 'D' : 'S';
    case 'R': return canSurrender ? 'R' : 'H';
    case 'r': return canSurrender ? 'R' : 'S';
    case 'P': return canSplit ? 'P' : 'H';
    case 'p': return canSurrender ? 'R' : canSplit ? 'P' : 'H';
  }
  return 'H';
}

function cell(table: StrategyTable, row: string, dealer: number): StrategyCode | null {
  return table[row]?.[dealer] ?? null;
}

export function getSoftTotal(cards: string[]): { total: number, isSoft: boolean } {
  let sum = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = cardRank(card);
    if (!rank) continue;
    sum += cardValue(rank);
    if (rank === 'A') aces++;
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return { total: sum, isSoft: aces > 0 && sum <= 21 };
}

export function getBasicStrategy(
  playerCards: string[],
  dealerCard: string,
  tableRules: TableRules = DEFAULT_TABLE_RULES,
  legality: { canDouble?: boolean; canSplit?: boolean; canSurrender?: boolean } = {},
): Action {
  const dealer = dealerColumn(dealerCard);
  const ranks = playerCards.map(cardRank);
  if (dealer === null || ranks.some((rank) => rank === null) || ranks.length === 0) return 'H';

  const rules = normalizeTableRules(tableRules);
  const strategy = strategyFor(rules);
  const { total, isSoft } = getSoftTotal(ranks as string[]);
  const initial = ranks.length === 2;
  const canDoubleByTable = initial && (rules.doubleRule === 'any-two' ||
    (rules.doubleRule === 'nine-eleven' && total >= 9 && total <= 11) ||
    (rules.doubleRule === 'ten-eleven' && total >= 10 && total <= 11));
  const canDoubleNow = canDoubleByTable && (legality.canDouble ?? true);
  const canSurrenderNow = initial && rules.surrender === 'late' && (legality.canSurrender ?? true);
  const canSplitNow = initial && (legality.canSplit ?? true);

  // A ten-value pair includes T, 10, J, Q, and K; pairs take precedence.
  if (initial && ranks[0] === ranks[1]) {
    const pairCode = cell(strategy.pairs, `${ranks[0]},${ranks[1]}`, dealer);
    if (pairCode) {
      const unavailablePureSplit = pairCode === 'P' && !canSplitNow;
      const unavailableSplitOrSurrender = pairCode === 'p' && !canSplitNow && !canSurrenderNow;
      // If a split-only instruction is unavailable, play the cards as their
      // ordinary hard/soft total rather than assuming Hit.
      if (!unavailablePureSplit && !unavailableSplitOrSurrender) {
        return resolveCode(pairCode, canDoubleNow, canSurrenderNow, canSplitNow);
      }
    }
  }

  let code: StrategyCode | null;
  if (isSoft) {
    // Soft rows are total-dependent after a hit as well as on the first deal.
    code = total >= 13 && total <= 20 ? cell(strategy.soft, `A,${total - 11}`, dealer) : null;
  } else {
    const row = total >= 18 ? '18+' : String(total);
    code = cell(strategy.hard, row, dealer);
  }

  // Safe total bounds preserve sensible blackjack behavior outside fixture rows.
  if (!code) return isSoft ? (total >= 18 ? 'S' : 'H') : (total >= 17 ? 'S' : 'H');
  return resolveCode(code, canDoubleNow, canSurrenderNow, false);
}

export type RecommendationInput = {
  playerCards: string[];
  dealerCard: string;
  tableRules?: Partial<TableRules>;
  runningCount: number;
  unseenCards: number;
  /** These reflect the current hand/round, rather than merely table rules. */
  canDouble?: boolean;
  canSplit?: boolean;
  canSurrender?: boolean;
  insurance?: boolean;
};

export type Recommendation = {
  action: Action;
  basicAction: Action;
  indexApplied: boolean;
  threshold: number | null;
  thresholdDirection: IndexDirection | null;
  thresholdLabel: string | null;
  trueCount: number;
  runningCount: number;
  explanation: string;
  profileId: string | null;
};

function actionIsLegal(action: Action, input: RecommendationInput): boolean {
  if (action === 'D') return input.canDouble ?? false;
  if (action === 'P') return input.canSplit ?? false;
  if (action === 'R') return input.canSurrender ?? false;
  return true;
}

function indexHand(cards: string[]): { kind: HandKind; hand: string } | null {
  const ranks = cards.map(cardRank);
  if (ranks.length === 0 || ranks.some((rank) => !rank)) return null;
  // Pair identification comes first and prevents a T,T hand from colliding
  // with the hard-20 table (or any other hard-table row).
  if (ranks.length === 2 && ranks[0] === ranks[1]) return { kind: 'pair', hand: `${ranks[0]},${ranks[1]}` };
  const { total, isSoft } = getSoftTotal(ranks as string[]);
  if (isSoft && total >= 13 && total <= 20) return { kind: 'soft', hand: `A,${total - 11}` };
  return { kind: 'hard', hand: String(total) };
}

function computedTrueCount(runningCount: number, unseenCards: number): number {
  return runningCount / Math.max(unseenCards / 52, 0.25);
}

/**
 * Pure, pre-action strategy selection. `unseenCards` must be captured before
 * dealing/hitting the next card; TC is intentionally never rounded.
 */
export function getRecommendation(input: RecommendationInput): Recommendation {
  const rules = normalizeTableRules(input.tableRules);
  const tc = computedTrueCount(input.runningCount, input.unseenCards);
  const basicAction = input.insurance ? 'N' : getBasicStrategy(
    input.playerCards,
    input.dealerCard,
    rules,
    { canDouble: input.canDouble, canSplit: input.canSplit, canSurrender: input.canSurrender },
  );
  const base: Omit<Recommendation, 'action' | 'explanation'> = {
    basicAction, indexApplied: false, threshold: null, thresholdDirection: null, thresholdLabel: null,
    trueCount: tc, runningCount: input.runningCount, profileId: null,
  };
  if (rules.accuracyMode !== 'hilo-index') {
    return { ...base, action: basicAction, explanation: input.insurance ? 'Basic strategy declines insurance.' : 'Basic strategy.' };
  }
  const support = getHiLoIndexSupport(rules);
  if (!support.supported) return { ...base, action: basicAction, explanation: `${support.explanation} Basic strategy used.` };
  const isDoubleDeck = support.profile === 'double-deck';
  const profileId = isDoubleDeck ? DOUBLE_DECK_HILO_INDEX_PROFILE_ID : FULL_HILO_INDEX_PROFILE_ID;
  const indexCount = isDoubleDeck ? Math.floor(tc) : tc;
  const countName = isDoubleDeck ? 'floored TC' : 'TC';
  if (input.insurance) {
    const applies = indexCount >= 3;
    const label = `${countName} ≥ +3`;
    return {
      ...base, action: applies ? 'I' : 'N', indexApplied: applies, threshold: 3,
      thresholdDirection: 'at-or-above', thresholdLabel: label, profileId,
      explanation: applies ? `Hi-Lo insurance index applied at ${label}.` : `Hi-Lo insurance index requires ${label}; no insurance.`,
    };
  }
  const hand = indexHand(input.playerCards);
  const dealer = cardRank(input.dealerCard);
  if (!hand || !dealer) return { ...base, action: basicAction, explanation: 'Invalid hand; basic strategy used.', profileId };
  const chart = isDoubleDeck ? DOUBLE_DECK_HILO_INDEX_RULES : FULL_HILO_INDEX_RULES[rules.dealerHitsSoft17 ? 'h17' : 's17'];
  const rule = chart.find((entry) =>
    entry.kind === hand.kind && entry.hand === hand.hand && entry.dealer === dealer &&
    (entry.surrenderContext === undefined || entry.surrenderContext === rules.surrender) &&
    (isDoubleDeck || actionIsLegal(entry.action, input)));
  if (!rule) {
    const scope = isDoubleDeck ? 'No applicable legal Table 31.2 deviation' : 'No applicable legal Hi-Lo index';
    return { ...base, action: basicAction, explanation: `${scope}; rule-correct basic strategy used.`, profileId };
  }
  const direction = rule.direction ?? 'at-or-above';
  // The BJA source has special 0+/0- running-count boundaries. Schlesinger
  // explicitly floors every two-deck true-count index, including zero.
  const count = isDoubleDeck ? indexCount : rule.index === 0 ? input.runningCount : tc;
  const applies = direction === 'above' ? count > rule.index
    : direction === 'at-or-above' ? count >= rule.index
    : direction === 'below' ? count < rule.index
    : count <= rule.index;
  const signed = rule.index > 0 ? `+${rule.index}` : String(rule.index);
  const comparator = direction === 'above' ? '>'
    : direction === 'at-or-above' ? '≥'
    : direction === 'below' ? '<'
    : '≤';
  const label = `${isDoubleDeck ? 'floored TC' : rule.index === 0 ? 'RC' : 'TC'} ${comparator} ${signed}`;
  const indexedActionIsLegal = actionIsLegal(rule.action, input);
  const indexApplied = applies && indexedActionIsLegal;
  const belowAction = isDoubleDeck ? rule.belowAction! : basicAction;
  const selectedAction = indexApplied ? rule.action : belowAction;
  const explanation = indexApplied
    ? `${isDoubleDeck ? 'Schlesinger Table 31.2' : 'Hi-Lo'} index applied: ${getActionName(rule.action)} at ${label}.`
    : isDoubleDeck && applies
      ? `Schlesinger Table 31.2 calls for ${getActionName(rule.action)} at ${label}, but that action is unavailable; ${getActionName(belowAction)} is the legal fallback.`
      : isDoubleDeck
        ? `Schlesinger Table 31.2 requires ${label}; below the index, ${getActionName(belowAction)}.`
        : `Hi-Lo index requires ${label}; rule-correct basic strategy used.`;
  return {
    ...base, action: selectedAction, indexApplied, threshold: rule.index,
    thresholdDirection: direction, thresholdLabel: label, profileId,
    explanation,
  };
}

export function getActionName(action: Action): string {
  switch (action) {
    case 'H': return 'Hit';
    case 'S': return 'Stand';
    case 'D': return 'Double';
    case 'P': return 'Split';
    case 'R': return 'Surrender';
    case 'I': return 'Take Insurance';
    case 'N': return 'No Insurance';
  }
}