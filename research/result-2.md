## Key facts
- **US-hole-card/peek is material.** Use only US-peek tables for the app’s stated configurations; no-hole-card/ENHC has different exposure on doubles/splits. Wizard explicitly treats no-peek-A and no-peek-10 separately, and identifies the loss of all added wagers when the dealer eventually has blackjack. [Rule variations](https://wizardofodds.com/games/blackjack/rule-variations/)
- **Deck count changes the chart, not just edge.** Wizard quantifies the adjusted-rule edge effects relative to 8D S17 DAS: 1D +0.48%, 2D +0.19%, 4D +0.06%, 6D +0.02%; H17 −0.22%; no DAS −0.14%; 9–11-only double −0.09%; 10–11-only −0.18%. Do not reuse a 6D chart for 1D/2D. [URL](https://wizardofodds.com/games/blackjack/rule-variations/)
- The independently surfaced configurable chart engine explicitly supports **1/2/4/6/8D; S17/H17; peek; any-two/9–11/10–11 doubles; DAS; none/late surrender**, and states those settings change cells. [URL](https://www.blackjacktrainer.fyi/charts)
- Its visible 6D H17 DAS LS peek baseline provides machine-readable cell checks: hard 9=`D` vs 3–6; 10=`D` vs 2–9; 11=`D` vs 2–A; 12=`S` vs 4–6; 15=`R` vs 10,A; 16=`R` vs 9,10,A; soft A,7=`D` vs 2–6, `S` 7–8, `H` 9–A; A,8=`D` vs 6; pairs 2,2/3,3 split 2–7; 4,4 split 5–6; 6,6 split 2–6; 8,8 split 2–10 and surrender A; 9,9 split 2–6,8–9; stand 7,10,A. These cells are from the fetched table, not a generalized chart.
- **Total vs composition:** total-dependent means total/softness/pair plus dealer upcard, and is the appropriate app strategy layer. Wizard’s exact-depletion program documents non-total exceptions; do not accidentally embed them in static total tables. Examples: all deck counts—stand 16 v 10 after 3+ cards; 2D S17—stand soft 18 v A after 3+ cards; 4D/6D S17—stand soft 18 v A after 4+ cards. [URL](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/)
- **Single/deck special caveats:** 1D H17 exact-composition source says its *two-card* total strategy has no broad changes but lists composition exceptions (e.g., 8=6+2 vs 6 hit; 12=7+5 or 8+4 vs 3 stand; 12=10+2 vs 4 hit). For 3+ cards, it broadly changes 12 v3 and 16 v10 to stand, subject to listed compositions. [URL](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-hit-soft-17/)
- 2D S17 composition source similarly records **no generic two-card changes**, while exact exceptions include 11=(9+2)/(8+3) v A hit and 12=(10+2) v4 hit; at 3+ cards it changes 16 v10 and soft-18 vA to stand, again with exact-composition exceptions. [URL](https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/)
- Wizard’s double-deck page flags a total-strategy aggregation edge case: 2-card soft 18 v A under S17 is infinitesimally hit-favored (−0.100359 vs −0.100502 stand), but stand is better when forced to choose one action across all soft-18 compositions; this is a policy-definition issue to lock down in tests. [URL](https://wizardofodds.com/games/blackjack/strategy/2-decks/)

## Claims requiring cross-reference before committing every cell
1. The fetched Wizard 1D/2D strategy charts are GIFs, not parsed as text. Use the app’s exact-EV engine/configurable-chart output or OCR plus a second authoritative table to transcribe *all* 120+ cells per rule tuple. Do **not** infer every 1D/2D S17/H17 difference from generic multi-deck cards.
2. Need an independent exact-EV export/test fixture for each of the 96 tuples (5 decks × 2 soft-17 × 2 DAS × 3 double rules × 2 surrender). The trainer claims coverage but the fetch exposed only its current 6D H17 DAS LS state.
3. Confirm application semantics: LS must be US late surrender after peek, whether surrender is allowed only on initial two cards, split-aces/re-split limits, and whether doubled decisions fallback to hit vs stand when unavailable. These can change implementation behavior even if the primary action table is correct.

## Source quality
- **High:** Michael Shackleford/Wizard of Odds: named author, recursive/combinatoric exact-card methodology, rule assumptions stated. It is the primary technical source here.
- **Medium:** BlackjackTrainer: useful independent, dynamically configurable strategy-engine cross-check; methodology is described as exact EV but full algorithm/data export not published.

## Gaps
- No fetched textual all-config matrix; multi-deck Wizard URL attempted (`/strategy/4-8-decks/`) is 404 and should not be used.
- Wizard’s composition pages use particular no-surrender/DAS/split-limit rules; their composition deviations are illustrative/caveat material, not automatically valid for all app tuples.

## Sources saved
- `research/sources/wizard-single-deck.md` — https://wizardofodds.com/games/blackjack/strategy/1-deck/
- `research/sources/wizard-double-deck.md` — https://wizardofodds.com/games/blackjack/strategy/2-decks/
- `research/sources/wizard-rule-variations.md` — https://wizardofodds.com/games/blackjack/rule-variations/
- `research/sources/wizard-1d-s17-composition.md` — https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-stand-soft-17/
- `research/sources/wizard-1d-h17-composition.md` — https://wizardofodds.com/games/blackjack/composition-dependent-strategy-one-deck-hit-soft-17/
- `research/sources/wizard-2d-s17-composition.md` — https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/
- `research/sources/blackjack-trainer-configurable-charts.md` — https://www.blackjacktrainer.fyi/charts
- `research/sources/wizard-multideck.md` records the failed/404 URL for traceability.

Four distinct web searches were run before fetching; seven valid distinct source URLs were fetched.