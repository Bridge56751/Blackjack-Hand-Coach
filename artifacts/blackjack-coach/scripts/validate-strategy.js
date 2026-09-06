const fixture = require('../lib/strategy-fixtures.json');

const decks = [1, 2, 4, 6, 8];
const requiredRows = {
  hard: ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18+'],
  soft: ['A,2', 'A,3', 'A,4', 'A,5', 'A,6', 'A,7', 'A,8', 'A,9'],
  pairs: ['2,2', '3,3', '4,4', '5,5', '6,6', '7,7', '8,8', '9,9', 'T,T', 'A,A'],
};
const codes = new Set(['H', 'S', 'D', 'd', 'P', 'R', 'r', 'p']);
const fail = (message) => { throw new Error(`Strategy fixture validation failed: ${message}`); };
const raw = (key, section, row, dealer) => {
  const value = fixture.strategies[key]?.[section]?.[row]?.[dealer];
  if (!value) fail(`missing ${key} ${section}/${row}/${dealer}`);
  return value;
};
const expect = (key, section, row, dealer, value) => {
  const actual = raw(key, section, row, dealer);
  if (actual !== value) fail(`${key} ${section}/${row}/${dealer}: expected ${value}, got ${actual}`);
};

const expectedKeys = [];
for (const deck of decks) for (const h17 of ['s17', 'h17']) for (const das of ['yes', 'no'])
  for (const double of ['all', 'd9', 'd10']) for (const surrender of ['ns', 'ls'])
    expectedKeys.push(`${deck}-${h17}-${das}-${double}-${surrender}`);
if (Object.keys(fixture.strategies).length !== 120 || expectedKeys.some((key) => !fixture.strategies[key])) fail('expected all 120 rule configurations');

for (const [key, strategy] of Object.entries(fixture.strategies)) {
  for (const [section, rows] of Object.entries(requiredRows)) {
    for (const row of rows) {
      const actions = strategy[section][row];
      if (!Array.isArray(actions) || actions.length !== 10) fail(`${key} ${section}/${row} must have 10 dealer columns`);
      for (const action of actions) if (!codes.has(action)) fail(`${key} ${section}/${row} contains unknown code ${action}`);
    }
  }
}

// Goldens independently check raw BlackjackInfo-engine cells against Wizard research.
expect('4-s17-yes-all-ns', 'hard', '11', 9, 'H');
expect('4-h17-yes-all-ns', 'hard', '11', 9, 'D');
expect('4-h17-yes-all-ns', 'soft', 'A,7', 0, 'd');
expect('4-h17-yes-all-ns', 'soft', 'A,8', 4, 'd');
for (const deck of [4, 6, 8]) {
  const key = `${deck}-s17-yes-all-ls`;
  expect(key, 'hard', '15', 8, 'R');
  for (const dealer of [7, 8, 9]) expect(key, 'hard', '16', dealer, 'R');
}
expect('4-h17-yes-all-ls', 'hard', '15', 9, 'R');
expect('4-h17-yes-all-ls', 'hard', '17', 9, 'r');
expect('1-s17-yes-all-ns', 'hard', '8', 3, 'D');
expect('1-s17-yes-all-ns', 'hard', '8', 4, 'D');
expect('1-s17-no-all-ns', 'pairs', '2,2', 0, 'H');
expect('1-s17-yes-all-ns', 'pairs', '4,4', 2, 'P');
expect('1-s17-no-all-ns', 'pairs', '4,4', 2, 'H');
expect('4-h17-yes-all-ls', 'pairs', '8,8', 9, 'p');
expect('4-h17-yes-d9-ns', 'soft', 'A,7', 0, 'S');
expect('4-h17-yes-d10-ns', 'soft', 'A,8', 4, 'S');

console.log(`Validated ${expectedKeys.length} blackjack strategy configurations and raw goldens.`);