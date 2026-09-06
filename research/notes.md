# Research Notes: Blackjack Basic Strategy Accuracy

**Status:** complete
**Depth:** Deep

## Plan

- **Question:** How should the app grade every supported hand under its selectable deck, soft-17, doubling, DAS, surrender, and ace-resplitting rules?
- **Scope:** Total-dependent basic strategy for US hole-card blackjack; composition-dependent exceptions only where a source clearly supports them. Card-count deviations, insurance, ENHC/no-hole-card, and split-ace post-split play are out of scope.
- **Audience:** Blackjack players who expect by-the-book grading.
- **Deliverable:** A sourced rules audit, corrected strategy engine, and automated regression fixtures covering every supported configuration.

## Focus Areas

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | Multi-deck S17/H17 hard and soft totals | done | `wizard-4-deck-strategy`, `bja-s17-basic-strategy`, `bja-h17-basic-strategy` |
| 2 | Single-deck and double-deck deviations | done | `wizard-single-deck-strategy`, `wizard-double-deck-strategy`, `blackjackinfo-strategy-engine` |
| 3 | Pair splitting, DAS, and resplitting | done | `wizard-blackjack-basics`, `blackjackinfo-strategy-engine`, `wizard-4-deck-strategy` |
| 4 | Late surrender and doubling restrictions | done | `wizard-surrender`, `wizard-blackjack-calculator`, `blackjackinfo-strategy-engine` |
| 5 | Validation methodology and authoritative calculators | done | `blackjackinfo-strategy-engine`, `wizard-appendix-9-6d-h17`, `wizard-rule-variations` |

## Coverage Checklist

- [x] Verify all hard-total cells for every supported rules family through the normalized 120-configuration fixture corpus.
- [x] Verify all soft-total cells, including H17/S17 changes, structurally and with Wizard/BJA golden cells.
- [x] Verify all pair cells with DAS/no-DAS in the fixture corpus.
- [x] Verify late-surrender recommendations and fallback plays.
- [x] Verify restricted-double fallback actions.
- [x] Determine which selected settings affect strategy versus only house edge.
- [x] Add regression fixtures for every strategy cell/configuration.
- [x] Explain grading assumptions and limitations in the audit.

## Findings Log

- `wizard-4-deck-strategy`: For the 4–8 deck total-dependent family, H17 changes include hard 11 vs A, soft 18 vs 2, and soft 19 vs 6; pair and surrender effects must remain rule-specific.
- `wizard-surrender`: Under US late surrender, the correct one-deck table is S17 hard 16 vs T **and A**; H17 adds hard 15 vs A and hard 17 vs A, while retaining hard 16 vs T/A. A pair of eights is not a generic hard-16 row.
- `blackjackinfo-strategy-engine`: Its selectable engine covers the corpus dimensions and defines ordered fallbacks: D is double/hit if unavailable; DS is double/stand if unavailable.
- `wizard-blackjack-calculator`: Confirms calculator notation and one-/two-deck chart distinctions; double and surrender are initial two-card decisions.
- `wizard-rule-variations`: Deck count, H17, DAS, surrender, and double limits affect optimal play/edge; US peek and no-peek must not share a chart.
- `wizard-blackjack-basics`: Split aces, resplitting, and hand caps are separate table rules; these affect split continuation values.
- `bja-s17-basic-strategy` and `bja-h17-basic-strategy`: independent visual cross-checks for conventional multi-deck S17/H17 cells.

## Conflicts & Open Questions

- Resolved for this product: grade total-dependent initial decisions only; do not import composition-dependent or count-index exceptions.
- Resolved: RSA, split-ace draw limits, and split caps are not represented by the 120 core configuration dimensions. They are limitations rather than silently inferred rules.
- Resolved operationally: each selected deck count has its own fixture configuration. The audit does not rely on a blanket 4/6/8 equivalence claim.

## Gaps

- The corpus is total-dependent, not composition-dependent exact-shoe play. It does not grade card-count indices.
- The corpus assumes US hole-card/peek and late surrender after the dealer has checked for blackjack; it is not valid for ENHC/no-hole-card rules.
- Split continuation rules (hand cap, RSA, one-card split aces, surrender-after-split) are outside the represented rule tuple and require stateful modeling if post-split hands are graded.