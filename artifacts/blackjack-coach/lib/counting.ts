import type { Card } from './game';
import type { TableRules } from './rules';

export function hiLoValue(card: Pick<Card, 'rank'>): number {
  if (['2', '3', '4', '5', '6'].includes(card.rank)) return 1;
  if (['T', 'J', 'Q', 'K', 'A'].includes(card.rank)) return -1;
  return 0;
}

export function trueCount(runningCount: number, unseenCards: number): number {
  return runningCount / Math.max(unseenCards / 52, 0.25);
}

export function estimatedPlayerEdge(rules: TableRules, count: number): number {
  let edge = -0.5;
  if (rules.dealerHitsSoft17) edge -= 0.2;
  if (!rules.doubleAfterSplit) edge -= 0.14;
  if (rules.surrender === 'none') edge -= 0.08;
  if (rules.doubleRule === 'nine-eleven') edge -= 0.1;
  if (rules.doubleRule === 'ten-eleven') edge -= 0.18;
  if (rules.decks === 1) edge += 0.18;
  if (rules.decks === 2) edge += 0.08;
  if (rules.decks === 8) edge -= 0.03;
  return Math.max(-4, Math.min(4, edge + count * 0.5));
}