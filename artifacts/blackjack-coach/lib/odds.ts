import { dealerShouldHit, handTotal } from './game.ts';
import type { Card } from './game.ts';
import type { TableRules } from './rules.ts';

export type HitStandOdds = {
  standWin: number;
  hitWin: number;
  iterations: number;
};

function seedFromCards(cards: Card[]): number {
  let seed = 2166136261;
  for (const card of cards) {
    for (const char of `${card.rank}${card.suit}${card.id}`) {
      seed ^= char.charCodeAt(0);
      seed = Math.imul(seed, 16777619);
    }
  }
  return seed >>> 0;
}

function randomGenerator(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function takeRandom(pool: Card[], random: () => number): Card {
  const index = Math.floor(random() * pool.length);
  const card = pool[index];
  pool[index] = pool[pool.length - 1];
  pool.pop();
  return card;
}

function dealerFinish(upcard: Card, pool: Card[], rules: TableRules, random: () => number): Card[] {
  const cards = [upcard, takeRandom(pool, random)];
  while (pool.length && dealerShouldHit(cards, rules)) cards.push(takeRandom(pool, random));
  return cards;
}

function playerWins(player: Card[], dealer: Card[]): boolean {
  const playerTotal = handTotal(player).total;
  const dealerTotal = handTotal(dealer).total;
  return playerTotal <= 21 && (dealerTotal > 21 || playerTotal > dealerTotal);
}

/**
 * Estimates win probability for standing now versus taking exactly one card
 * and then standing. The hidden dealer card is sampled from the unseen pool,
 * so its real value is never leaked into the displayed odds.
 */
export function estimateHitStandOdds(
  player: Card[],
  dealerUpcard: Card,
  unseenCards: Card[],
  rules: TableRules,
  iterations = 1200,
): HitStandOdds {
  if (!player.length || unseenCards.length < 2) return { standWin: 0, hitWin: 0, iterations: 0 };
  const random = randomGenerator(seedFromCards([...player, dealerUpcard, ...unseenCards]));
  let standWins = 0;
  let hitWins = 0;

  for (let i = 0; i < iterations; i++) {
    const standPool = [...unseenCards];
    const standDealer = dealerFinish(dealerUpcard, standPool, rules, random);
    if (playerWins(player, standDealer)) standWins++;

    const hitPool = [...unseenCards];
    const hidden = takeRandom(hitPool, random);
    const hitCard = takeRandom(hitPool, random);
    const hitPlayer = [...player, hitCard];
    const hitDealer = [dealerUpcard, hidden];
    while (hitPool.length && dealerShouldHit(hitDealer, rules)) hitDealer.push(takeRandom(hitPool, random));
    if (playerWins(hitPlayer, hitDealer)) hitWins++;
  }

  return {
    standWin: standWins / iterations * 100,
    hitWin: hitWins / iterations * 100,
    iterations,
  };
}