import type { TableRules } from './rules';

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
export type Card = { rank: Rank; suit: Suit; id: string };
export type GameHand = { id: string; cards: Card[]; bet: number; doubled: boolean; surrendered: boolean; splitAces: boolean; fromSplit: boolean; outcome?: HandOutcome };
export type HandOutcome = 'Win' | 'Loss' | 'Push' | 'Blackjack' | 'Surrender' | 'Bust';

const ranks: Rank[] = ['A','2','3','4','5','6','7','8','9','T','J','Q','K'];
const suits: Suit[] = ['♠','♥','♦','♣'];
export const cardLabel = (card: Card) => `${card.rank === 'T' ? '10' : card.rank}${card.suit}`;
export const cardRankForStrategy = (card: Card) => card.rank === 'T' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' ? 'T' : card.rank;
export const isRed = (card: Card) => card.suit === '♥' || card.suit === '♦';
export const cardValue = (card: Card) => card.rank === 'A' ? 11 : ['T','J','Q','K'].includes(card.rank) ? 10 : Number(card.rank);

export function createShoe(decks: number): Card[] {
  const shoe: Card[] = [];
  for (let deck = 0; deck < decks; deck++) for (const suit of suits) for (const rank of ranks) shoe.push({ rank, suit, id: `${deck}-${rank}-${suit}` });
  return shuffle(shoe);
}
export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; }
  return next;
}
export function draw(shoe: Card[]): { card: Card; shoe: Card[] } {
  if (!shoe.length) throw new Error('The shoe is empty.');
  return { card: shoe[0], shoe: shoe.slice(1) };
}
export function handTotal(cards: Card[]) {
  let total = cards.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = cards.filter(card => card.rank === 'A').length;
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 && total <= 21 };
}
export const isBlackjack = (hand: GameHand) => hand.cards.length === 2 && !hand.fromSplit && handTotal(hand.cards).total === 21;
export function dealerShouldHit(cards: Card[], rules: TableRules) {
  const total = handTotal(cards);
  return total.total < 17 || (total.total === 17 && total.soft && rules.dealerHitsSoft17);
}
export function canDouble(hand: GameHand, rules: TableRules) {
  const total = handTotal(hand.cards).total;
  const permitted = rules.doubleRule === 'any-two' || (rules.doubleRule === 'nine-eleven' && total >= 9 && total <= 11) || (rules.doubleRule === 'ten-eleven' && total >= 10 && total <= 11);
  return hand.cards.length === 2 && !hand.doubled && !hand.splitAces && (!hand.fromSplit || rules.doubleAfterSplit) && permitted;
}
export function canSplit(hand: GameHand, rules: TableRules, handCount: number) {
  if (hand.cards.length !== 2) return false;
  const sameValue = cardValue(hand.cards[0]) === cardValue(hand.cards[1]);
  const aces = hand.cards[0]?.rank === 'A';
  return sameValue && handCount < 4 && (!aces || !hand.fromSplit || rules.resplitAces);
}
export function settleHand(hand: GameHand, dealer: Card[]): { outcome: HandOutcome; credit: number } {
  if (hand.surrendered) return { outcome: 'Surrender', credit: hand.bet / 2 };
  const player = handTotal(hand.cards).total;
  if (player > 21) return { outcome: 'Bust', credit: 0 };
  if (isBlackjack(hand)) return handTotal(dealer).total === 21 && dealer.length === 2 ? { outcome: 'Push', credit: hand.bet } : { outcome: 'Blackjack', credit: hand.bet * 2.5 };
  const dealerTotal = handTotal(dealer).total;
  if (dealerTotal > 21 || player > dealerTotal) return { outcome: 'Win', credit: hand.bet * 2 };
  if (player < dealerTotal) return { outcome: 'Loss', credit: 0 };
  return { outcome: 'Push', credit: hand.bet };
}

export function settleInsurance(stake: number, dealerHasBlackjack: boolean): { credit: number; net: number } {
  if (stake <= 0) return { credit: 0, net: 0 };
  return dealerHasBlackjack
    ? { credit: stake * 3, net: stake * 2 }
    : { credit: 0, net: -stake };
}