import fixture from './strategy-fixtures.json';
import { DEFAULT_TABLE_RULES, normalizeTableRules, TableRules } from './rules';

export type Action = 'H' | 'S' | 'D' | 'P' | 'R' | 'I' | 'N';
type StrategyCode = Action | 'd' | 'r' | 'p';
type StrategyTable = Record<string, StrategyCode[]>;
type Strategy = { hard: StrategyTable; soft: StrategyTable; pairs: StrategyTable };

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

export function getBasicStrategy(playerCards: string[], dealerCard: string, tableRules: TableRules = DEFAULT_TABLE_RULES): Action {
  const dealer = dealerColumn(dealerCard);
  const ranks = playerCards.map(cardRank);
  if (dealer === null || ranks.some((rank) => rank === null) || ranks.length === 0) return 'H';

  const rules = normalizeTableRules(tableRules);
  const strategy = strategyFor(rules);
  const { total, isSoft } = getSoftTotal(ranks as string[]);
  const initial = ranks.length === 2;
  const canDouble = initial && (rules.doubleRule === 'any-two' ||
    (rules.doubleRule === 'nine-eleven' && total >= 9 && total <= 11) ||
    (rules.doubleRule === 'ten-eleven' && total >= 10 && total <= 11));
  const canSurrender = initial && rules.surrender === 'late';

  // A ten-value pair includes T, 10, J, Q, and K; pairs take precedence.
  if (initial && ranks[0] === ranks[1]) {
    const pairCode = cell(strategy.pairs, `${ranks[0]},${ranks[1]}`, dealer);
    if (pairCode) return resolveCode(pairCode, canDouble, canSurrender, true);
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
  return resolveCode(code, canDouble, canSurrender, false);
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