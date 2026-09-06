import { canDouble, canSplit, createShoe, dealerShouldHit, handTotal, settleHand } from '../lib/game.ts';
import type { GameHand } from '../lib/game.ts';
import { DEFAULT_TABLE_RULES } from '../lib/rules.ts';
let cardId = 0;
const c = (rank: any) => ({ rank, suit: '♠' as const, id: `${rank}-${cardId++}` });
const hand = (cards: any[], bet = 10): GameHand => ({ id: 'h', cards: cards.map(c), bet, doubled: false, surrendered: false, splitAces: false, fromSplit: false });
function ok(value: boolean, name: string) { if (!value) throw new Error(`Failed: ${name}`); }
ok(handTotal([c('A'),c('6')]).total === 17 && handTotal([c('A'),c('6')]).soft, 'soft ace totals');
ok(!dealerShouldHit([c('A'),c('6')], DEFAULT_TABLE_RULES), 'S17 stands');
ok(dealerShouldHit([c('A'),c('6')], { ...DEFAULT_TABLE_RULES, dealerHitsSoft17: true }), 'H17 hits');
ok(settleHand(hand(['A','K']), [c('T'),c('7')]).credit === 25, 'blackjack 3:2');
ok(settleHand({ ...hand(['T','9'], 20), doubled: true }, [c('T'),c('8')]).credit === 40, 'double settlement');
ok(canSplit(hand(['8','8']), DEFAULT_TABLE_RULES, 1) && canDouble({ ...hand(['5','4']), fromSplit: true }, DEFAULT_TABLE_RULES), 'split and DAS');
ok(createShoe(6).length === 312 && createShoe(1).length === 52, 'shoe counts');
console.log('Blackjack game validation passed.');