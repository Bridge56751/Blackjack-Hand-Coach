import { DEFAULT_TABLE_RULES, getHiLoIndexSupport, normalizeTableRules } from '../lib/rules.ts';
import {
  DOUBLE_DECK_HILO_INDEX_PROFILE_ID,
  DOUBLE_DECK_HILO_INDEX_RULES,
  FULL_HILO_INDEX_RULES,
  FULL_HILO_INDEX_PROFILE_ID,
  getRecommendation,
} from '../lib/strategy.ts';

const ok = (value: boolean, name: string) => { if (!value) throw new Error(`Hi-Lo index validation failed: ${name}`); };
const cardsFor = (kind: string, hand: string): string[] => {
  if (kind === 'pair') return hand.split(',');
  if (kind === 'soft') return hand.split(',');
  const total = Number(hand);
  if (total === 8) return ['3', '5'];
  return total <= 11 ? ['4', String(total - 4)] : ['T', String(total - 10)];
};
const rcFor = (index: number, delta: number) => index + delta;

// Every published overlay entry is checked just below, at, and above its
// threshold. One unseen deck makes running count and true count identical.
for (const [dealerMode, rules] of Object.entries(FULL_HILO_INDEX_RULES) as ['h17' | 's17', typeof FULL_HILO_INDEX_RULES.h17][]) {
  for (const rule of rules) {
    for (const delta of [-.01, 0, .01]) {
      const result = getRecommendation({
        playerCards: cardsFor(rule.kind, rule.hand), dealerCard: rule.dealer,
        tableRules: { ...DEFAULT_TABLE_RULES, dealerHitsSoft17: dealerMode === 'h17', surrender: rule.surrenderContext ?? 'late', accuracyMode: 'hilo-index' },
        runningCount: rcFor(rule.index, delta), unseenCards: 52, canDouble: true, canSplit: true, canSurrender: true,
      });
      const direction = rule.direction ?? 'at-or-above';
      const applies = direction === 'above' ? delta > 0
        : direction === 'at-or-above' ? delta >= 0
        : direction === 'below' ? delta < 0
        : delta <= 0;
      ok(result.indexApplied === applies, `${dealerMode} ${rule.kind} ${rule.hand} v ${rule.dealer} @ ${rule.index + delta}`);
    }
  }
}

ok(getRecommendation({ playerCards: ['5', '5'], dealerCard: 'T', runningCount: 4, unseenCards: 52, canDouble: false, tableRules: { accuracyMode: 'hilo-index' } }).action !== 'D', 'illegal double falls back');
ok(getRecommendation({ playerCards: ['T', 'T'], dealerCard: '6', runningCount: 4, unseenCards: 52, canSplit: false, tableRules: { accuracyMode: 'hilo-index' } }).action !== 'P', 'illegal split falls back');
ok(getRecommendation({ playerCards: ['T', '6'], dealerCard: '9', runningCount: 3, unseenCards: 52, canSurrender: false, tableRules: { accuracyMode: 'hilo-index' } }).action !== 'R', 'no surrender recommendation when unavailable');
ok(getRecommendation({ playerCards: ['A', '7'], dealerCard: '3', runningCount: 0, unseenCards: 52, canDouble: false, tableRules: { dealerHitsSoft17: false, accuracyMode: 'hilo-index' } }).action === 'S', 'double-otherwise-stand fallback is preserved');
ok(getRecommendation({ playerCards: ['9', '9'], dealerCard: '6', runningCount: 0, unseenCards: 52, canSplit: false, tableRules: { accuracyMode: 'hilo-index' } }).action === 'S', 'unavailable pair split falls through to hard total');
ok(getRecommendation({ playerCards: ['A', 'A'], dealerCard: '6', runningCount: 0, unseenCards: 52, canSplit: false, tableRules: { accuracyMode: 'hilo-index' } }).action === 'H', 'unavailable ace split falls through to soft total');
ok(getRecommendation({ playerCards: ['8', '8'], dealerCard: 'A', runningCount: 0, unseenCards: 52, canSplit: false, canSurrender: true, tableRules: { dealerHitsSoft17: true, surrender: 'late', accuracyMode: 'hilo-index' } }).action === 'R', 'pair surrender fallback is preserved');
ok(getRecommendation({ playerCards: [], dealerCard: 'A', insurance: true, runningCount: 3, unseenCards: 52, tableRules: { accuracyMode: 'hilo-index' } }).action === 'I', 'insurance at TC +3');
ok(getRecommendation({ playerCards: [], dealerCard: 'A', insurance: true, runningCount: 2.99, unseenCards: 52, tableRules: { accuracyMode: 'hilo-index' } }).action === 'N', 'insurance below TC +3');
ok(getRecommendation({ playerCards: ['T', '6'], dealerCard: 'T', runningCount: 0, unseenCards: 52, canSurrender: false, tableRules: { surrender: 'none', accuracyMode: 'hilo-index' } }).action === 'H', '16vT zero remains hit without LS');
ok(getRecommendation({ playerCards: ['T', '6'], dealerCard: 'T', runningCount: 0.01, unseenCards: 52, canSurrender: false, tableRules: { surrender: 'none', accuracyMode: 'hilo-index' } }).action === 'S', '16vT positive RC stands without LS');
ok(getRecommendation({ playerCards: ['T', '7'], dealerCard: 'A', runningCount: 2, unseenCards: 52, canSurrender: true, tableRules: { accuracyMode: 'hilo-index', dealerHitsSoft17: true } }).action === 'R', 'H17 17vA index');
ok(getRecommendation({ playerCards: ['T', '7'], dealerCard: 'A', runningCount: 2, unseenCards: 52, canSurrender: true, tableRules: { accuracyMode: 'hilo-index', dealerHitsSoft17: false } }).action !== 'R', 'S17 differs from H17');
ok(getRecommendation({ playerCards: ['T', '5'], dealerCard: 'A', runningCount: -1, unseenCards: 52, canSurrender: true, tableRules: { accuracyMode: 'hilo-index', dealerHitsSoft17: true } }).action === 'R', 'H17 15vA surrenders at TC -1');
ok(getRecommendation({ playerCards: ['T', '5'], dealerCard: 'A', runningCount: -1.01, unseenCards: 52, canSurrender: true, tableRules: { accuracyMode: 'hilo-index', dealerHitsSoft17: true } }).action === 'H', 'H17 15vA hits below TC -1');
ok(getRecommendation({ playerCards: ['T', '6'], dealerCard: '9', runningCount: -1, unseenCards: 52, canSurrender: true, tableRules: { accuracyMode: 'hilo-index' } }).action === 'H', '16v9 hits at TC -1 with LS');
ok(getRecommendation({ playerCards: ['T', '6'], dealerCard: '9', runningCount: -.99, unseenCards: 52, canSurrender: true, tableRules: { accuracyMode: 'hilo-index' } }).action === 'R', '16v9 surrenders above TC -1 with LS');
const s17A8 = FULL_HILO_INDEX_RULES.s17.filter((rule) => rule.kind === 'soft' && rule.hand === 'A,8').map((rule) => rule.index).join(',');
const h17A8 = FULL_HILO_INDEX_RULES.h17.filter((rule) => rule.kind === 'soft' && rule.hand === 'A,8').map((rule) => `${rule.dealer}:${rule.action}:${rule.index}:${rule.direction ?? '+'}`).join(',');
ok(s17A8 === '3,1,1' && h17A8 === '4:D:3:+,5:D:1:+,6:S:0:below', 'PDF A,8 goldens');
ok(FULL_HILO_INDEX_RULES.s17.some((rule) => rule.kind === 'hard' && rule.hand === '11' && rule.dealer === 'A' && rule.index === 1), 'S17 11vA +1 golden');
ok(!FULL_HILO_INDEX_RULES.h17.some((rule) => rule.kind === 'hard' && rule.hand === '11' && rule.dealer === 'A'), 'H17 11vA absent');
ok(!FULL_HILO_INDEX_RULES.s17.some((rule) => rule.hand === '12' && ['5', '6'].includes(rule.dealer)) && !FULL_HILO_INDEX_RULES.s17.some((rule) => rule.hand === '14'), 'removed non-PDF cells absent');
ok(getRecommendation({ playerCards: ['T', '6'], dealerCard: 'T', runningCount: 10, unseenCards: 52, tableRules: { decks: 2, accuracyMode: 'hilo-index' } }).profileId === null, 'unsupported deck uses basic');
ok(normalizeTableRules({ decks: 2, accuracyMode: 'hilo-index' }).accuracyMode === 'basic', 'unsupported persisted mode normalizes to basic');
ok(normalizeTableRules({ name: 'legacy' }).accuracyMode === 'basic', 'legacy rules default to basic');
ok(getRecommendation({ playerCards: [], dealerCard: 'A', insurance: true, runningCount: 9, unseenCards: 52 }).action === 'N', 'basic declines insurance');
ok(FULL_HILO_INDEX_PROFILE_ID.includes('v1'), 'versioned profile id');

const doubleDeckRules = {
  ...DEFAULT_TABLE_RULES,
  decks: 2 as const,
  dealerHitsSoft17: false,
  doubleAfterSplit: false,
  doubleRule: 'any-two' as const,
  surrender: 'none' as const,
  accuracyMode: 'hilo-index' as const,
};

ok(DOUBLE_DECK_HILO_INDEX_RULES.length === 49, '49 playing-decision rows plus insurance');
for (const rule of DOUBLE_DECK_HILO_INDEX_RULES) {
  for (const [offset, applies] of [[-0.01, false], [0, true], [0.99, true], [1, true]] as const) {
    const rawTrueCount = rule.index + offset;
    const result = getRecommendation({
      playerCards: cardsFor(rule.kind, rule.hand),
      dealerCard: rule.dealer,
      tableRules: doubleDeckRules,
      runningCount: rawTrueCount,
      unseenCards: 52,
      canDouble: true,
      canSplit: true,
      canSurrender: false,
    });
    ok(result.indexApplied === applies, `2D floored ${rule.kind} ${rule.hand} v ${rule.dealer} at raw TC ${rawTrueCount}`);
    ok(result.profileId === DOUBLE_DECK_HILO_INDEX_PROFILE_ID, `2D provenance ${rule.hand} v ${rule.dealer}`);
    if (result.indexApplied) {
      ok(result.action === rule.action, `2D action ${rule.hand} v ${rule.dealer}`);
      ok(['H', 'S', 'D', 'P'].includes(result.action), `2D supported action legal ${rule.hand} v ${rule.dealer}`);
    } else {
      const independentlyExpectedBelow =
        rule.action === 'P' ? (rule.hand === 'T,T' ? 'S' : 'H')
        : rule.kind === 'soft' && rule.action === 'D' && Number(rule.hand.split(',')[1]) >= 7 ? 'S'
        : 'H';
      ok(result.action === independentlyExpectedBelow, `2D opposite-side play ${rule.hand} v ${rule.dealer}`);
    }
  }
}

const negativeFloor = getRecommendation({
  playerCards: ['T', '2'], dealerCard: '5', tableRules: doubleDeckRules,
  runningCount: -0.01, unseenCards: 52, canDouble: true, canSplit: true, canSurrender: false,
});
ok(negativeFloor.indexApplied && negativeFloor.threshold === -1, 'negative fractional TC floors down to -1');
ok(negativeFloor.thresholdLabel === 'floored TC ≥ -1', 'floored threshold is reported');
ok(getRecommendation({
  playerCards: ['T', '2'], dealerCard: '5', tableRules: doubleDeckRules,
  runningCount: -1.01, unseenCards: 52, canDouble: true, canSplit: true, canSurrender: false,
}).indexApplied === false, 'negative flooring below boundary');
ok(getRecommendation({
  playerCards: [], dealerCard: 'A', insurance: true, tableRules: doubleDeckRules,
  runningCount: 3.99, unseenCards: 52,
}).action === 'I', '2D insurance uses floored TC at +3');
ok(getRecommendation({
  playerCards: [], dealerCard: 'A', insurance: true, tableRules: doubleDeckRules,
  runningCount: 2.99, unseenCards: 52,
}).action === 'N', '2D insurance below floored +3');
ok(getRecommendation({
  playerCards: ['4', '4'], dealerCard: '6', tableRules: doubleDeckRules,
  runningCount: 8, unseenCards: 52, canDouble: false, canSplit: true, canSurrender: false,
}).action !== 'D', '2D illegal double falls back to rule-correct basic strategy');
ok(getRecommendation({
  playerCards: ['T', 'T'], dealerCard: '5', tableRules: doubleDeckRules,
  runningCount: 8, unseenCards: 52, canDouble: true, canSplit: false, canSurrender: false,
}).action === 'S', '2D illegal ten split uses explicit stand fallback');

const expectedOppositeSideCases = [
  { cards: ['T', '2'], dealer: '4', index: 1, expected: 'H', name: '12v4 below +1 hits' },
  { cards: ['T', '3'], dealer: '2', index: 0, expected: 'H', name: '13v2 below 0 hits' },
  { cards: ['6', '5'], dealer: 'T', index: -5, expected: 'H', name: '11vT below -5 hits' },
  { cards: ['6', '6'], dealer: '2', index: 1, expected: 'H', name: '66v2 below +1 hits' },
  { cards: ['A', '7'], dealer: 'A', index: -1, expected: 'H', name: 'A7vA below -1 hits' },
  { cards: ['A', '8'], dealer: '6', index: 1, expected: 'S', name: 'A8v6 below +1 stands' },
  { cards: ['A', '3'], dealer: '4', index: 1, expected: 'H', name: 'A3v4 below +1 hits' },
  { cards: ['T', 'T'], dealer: '6', index: 5, expected: 'S', name: 'TTv6 below +5 stands' },
  { cards: ['4', '4'], dealer: '5', index: 4, expected: 'H', name: '44v5 below +4 hits' },
] as const;
for (const example of expectedOppositeSideCases) {
  const result = getRecommendation({
    playerCards: [...example.cards], dealerCard: example.dealer, tableRules: doubleDeckRules,
    runningCount: example.index - 0.01, unseenCards: 52,
    canDouble: true, canSplit: true, canSurrender: false,
  });
  ok(result.action === example.expected && !result.indexApplied, example.name);
}

ok(getRecommendation({
  playerCards: ['2', '4', '5'], dealerCard: 'T', tableRules: doubleDeckRules,
  runningCount: -5, unseenCards: 52, canDouble: false, canSplit: false, canSurrender: false,
}).action === 'H', 'multi-card hard 11 cannot double and uses explicit hit fallback');
ok(getRecommendation({
  playerCards: ['A', '2', '6'], dealerCard: '6', tableRules: doubleDeckRules,
  runningCount: 2, unseenCards: 52, canDouble: false, canSplit: false, canSurrender: false,
}).action === 'S', 'multi-card soft 19 cannot double and uses explicit stand fallback');

for (const incompatible of [
  { dealerHitsSoft17: true },
  { doubleAfterSplit: true },
  { surrender: 'late' as const },
  { doubleRule: 'nine-eleven' as const },
]) {
  const rules = { ...doubleDeckRules, ...incompatible };
  ok(normalizeTableRules(rules).accuracyMode === 'basic', `unsupported 2D rules normalize: ${JSON.stringify(incompatible)}`);
  ok(getRecommendation({
    playerCards: ['T', '6'], dealerCard: 'T', tableRules: rules,
    runningCount: 20, unseenCards: 52, canDouble: true, canSplit: true, canSurrender: true,
  }).profileId === null, `unsupported 2D rules use basic: ${JSON.stringify(incompatible)}`);
}
ok(normalizeTableRules(doubleDeckRules).accuracyMode === 'hilo-index', 'exact 2D profile remains selected');
ok(getHiLoIndexSupport(doubleDeckRules).profile === 'double-deck', 'shared helper selects 2D profile');
ok(getHiLoIndexSupport({ ...doubleDeckRules, decks: 1 }).supported === false, 'single deck unsupported');
ok(getHiLoIndexSupport({ ...doubleDeckRules, decks: 6 }).profile === 'multideck', 'existing multideck profile preserved');
ok(getRecommendation({
  playerCards: ['T', '6'], dealerCard: 'T', tableRules: { ...doubleDeckRules, decks: 6 },
  runningCount: 0.01, unseenCards: 52, canDouble: true, canSplit: true, canSurrender: false,
}).profileId === FULL_HILO_INDEX_PROFILE_ID, 'multideck provenance unchanged');

console.log('Validated public multideck and verified Table 31.2 double-deck Hi-Lo boundaries and fallbacks.');