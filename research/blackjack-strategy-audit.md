# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)# Blackjack Strategy Grading Accuracy Audit

**Date:** 2026-09-05  
**Research tier:** Deep  
**Status:** complete

## Executive summary

Wizard’s documented rule variations establish that deck count, dealer soft-17 treatment, DAS, surrender, and double restrictions are material blackjack rules, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/) The app now grades against an exhaustive **120-configuration, total-dependent fixture corpus** sourced from the BlackjackInfo rule-selectable strategy engine. The corpus spans five deck counts, S17/H17, DAS/no DAS, three double rules, and late/no surrender. It is structurally validated and has Wizard of Odds and Blackjack Apprenticeship (BJA) golden-cell checks. This is a total-dependent initial-decision trainer—not composition-dependent perfect play and not card-count-index play. BlackjackInfo exposes the required deck, soft-17, doubling, DAS, surrender, and US-peek selectors.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)

The principal correctness boundary is the rule contract. These fixtures apply to US hole-card blackjack with a dealer peek before the player acts. They must not be reused for ENHC/no-hole-card games, where dealer blackjack exposes added split and double wagers differently.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

## Grading contract and assumptions

The configuration identity is:

`{1, 2, 4, 6, 8 decks} × {S17, H17} × {DAS, no DAS} × {any two, 9–11, 10–11 double} × {no late surrender, late surrender}` = **120** configurations.

Grade the initial two-card choice in this precedence: applicable late surrender, pair split, soft-total action, then hard-total action. Store compound cells as ordered legal choices: `RP` means surrender then split if surrender is unavailable; `D`/`DH` means double then hit if doubling is unavailable; `DS` means double then stand.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/) Double and late surrender are initial-two-card options; a later multi-card hand cannot receive either recommendation.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)

## Verified rule-dependent recommendations

- **Late surrender:** after a failed dealer peek, the corrected one-deck total-dependent row is **S17: hard 16 vs T and A**. Under **H17**, surrender hard 15 vs A, hard 16 vs T/A, and hard 17 vs A. This corrects the earlier erroneous one-deck S17 omission of 16 vs A.[4](https://wizardofodds.com/games/blackjack/surrender/)
- For two decks, S17 adds 15 vs T; for 4/6/8 decks, S17 is 15 vs T and 16 vs 9/T/A. H17 adds 15 vs A and 17 vs A to the applicable rows.[4](https://wizardofodds.com/games/blackjack/surrender/) Do not treat 8,8 as generic hard 16: it is a pair decision and can be `RP` under qualifying H17 late-surrender rules.[4](https://wizardofodds.com/games/blackjack/surrender/)[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
- **H17 changes:** in the conventional 4–8 deck total-dependent family, hard 11 vs A changes to double; soft 18 vs 2 and soft 19 vs 6 become double-stand cells. Wizard’s rule-specific chart and BJA’s S17/H17 cards cross-check these visible changes.[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
- **Double restrictions:** retain the source fallback, rather than inventing a new chart. When unavailable, a double-hit cell becomes hit and a double-stand cell becomes stand; 10–11-only additionally removes hard-9 doubles.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)
- **Pairs and DAS:** DAS changes split continuation value and therefore pair recommendations; it is not merely a house-edge toggle. A,A remains split on the conventional cited charts, while split limits and resplitting aces remain separate rules.[8](https://wizardofodds.com/games/blackjack/basics/)[9](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Implementation findings

The fixture representation must keep hard, soft, and pair matrices separate. A non-split pair falls through to its actual total (for example, 9,9 is hard 18), rather than to a generic hit. The full corpus is configuration-specific, so the app does not assume that one multi-deck chart is exact for one or two decks. Wizard documents deck-count and rule changes as strategy/edge material, not cosmetic settings.[1](https://wizardofodds.com/games/blackjack/rule-variations/)

Fixture generation was treated as an oracle export, then normalized into ordered actions and checked for complete configuration, row, column, and action coverage. Golden cells were compared against Wizard’s calculator/strategy material and BJA’s published S17/H17 cards.[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[5](https://wizardofodds.com/games/blackjack/strategy/4-decks)[6](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)[7](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf) Wizard’s six-deck H17 expected-return appendix provides an additional action-EV reference for close calls.[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Validation approach

1. Enumerate all 120 rule tuples and require a complete hard/soft/pair matrix for each.
2. Validate action tokens and fallback ordering; reject illegal surrender/double recommendations outside an initial two-card state.
3. Assert high-signal golden cells: one-deck surrender rows; H17 hard-11/soft-18/soft-19 deltas; DAS-sensitive pair cells; and `RP`, `DH`, and `DS` behavior.
4. Cross-check configured outputs against BlackjackInfo, Wizard, and BJA; use expected-return data to investigate near ties rather than silently changing a fixture.[2](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)[3](https://wizardofodds.com/games/blackjack/strategy/calculator/)[10](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)

## Limitations

- This is **total-dependent** strategy. Exact composition can change some one- and two-deck decisions, so those exceptions are intentionally excluded.[11](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)[12](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- It does not include card-count deviations, insurance, or betting advice.
- It assumes US peek and late surrender after the peek; it is not an ENHC/no-peek chart.[1](https://wizardofodds.com/games/blackjack/rule-variations/)
- RSA, split-hand cap, one-card split-ace treatment, and post-split surrender are not dimensions of the 120-tuple corpus. They affect split continuation values and require explicit stateful rules before grading post-split decisions.[8](https://wizardofodds.com/games/blackjack/basics/)

## Recommendations

Keep the 120 fixtures versioned with their normalized BlackjackInfo provenance and retain golden-cell tests from Wizard/BJA. Present the US-peek and total-dependent assumptions in the product. If the app later grades play after a split, add split-origin, hand-cap, RSA, split-ace, and DAS state before offering advice. Do not add composition-dependent exceptions or count indices to this corpus without a separately labeled mode.

## Sources

1. [Wizard of Odds, “Blackjack Rule Variations”](https://wizardofodds.com/games/blackjack/rule-variations/)
2. [BlackjackInfo, “Blackjack Strategy Charts – Generate Charts for 1–8 Decks”](https://www.blackjackinfo.com/blackjack-basic-strategy-engine)
3. [Wizard of Odds, “Blackjack Basic Strategy – Optimal Play for Every Hand”](https://wizardofodds.com/games/blackjack/strategy/calculator/)
4. [Wizard of Odds, “When to Surrender in Blackjack”](https://wizardofodds.com/games/blackjack/surrender/)
5. [Wizard of Odds, “Blackjack Strategy for 4 Decks”](https://wizardofodds.com/games/blackjack/strategy/4-decks)
6. [Blackjack Apprenticeship, “S17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf)
7. [Blackjack Apprenticeship, “H17 Basic Strategy”](https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf)
8. [Wizard of Odds, “Blackjack”](https://wizardofodds.com/games/blackjack/basics/)
9. [Wizard of Odds, “Double-Deck Blackjack Strategy”](https://wizardofodds.com/games/blackjack/strategy/2-decks/)
10. [Wizard of Odds, “Blackjack Expected Returns for Six Decks and Dealer Hits on Soft 17”](https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4)
11. [Wizard of Odds, “Composition-Dependent Strategy for Single Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
12. [Wizard of Odds, “Composition-Dependent Strategy for Double Deck and Dealer Stands on Soft 17”](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)