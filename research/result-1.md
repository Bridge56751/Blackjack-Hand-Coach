Research complete. Saved fetched sources:
- `research/sources/wizard-4deck.md` — https://wizardofodds.com/games/blackjack/strategy/4-decks
- `research/sources/blackjackinfo-engine.md` — https://www.blackjackinfo.com/blackjack-basic-strategy-engine
- `research/sources/bja-h17.pdf.md` — https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/H17-Basic-Strategy.pdf
- `research/sources/bja-s17.pdf.md` — https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf

## Key facts — machine-implementable total tables
**Scope/basis:** US peek/hole-card, 4–8 decks. Wizard explicitly labels its page “4-Deck to 8-Deck,” says the charts cover hard, soft, and pairs, and supplies text strategy. These total decisions are one common matrix across 4/6/8 decks under the stated rules. Upcards order: `[2,3,4,5,6,7,8,9,T,A]`. `D=double else hit`; `DS=double else stand`.

### Baseline: S17, DAS, double-any-two, late surrender
Hard rows, encoded by action ranges:
- 5–8: H all; 9: `H,D,D,D,D,H,H,H,H,H`; 10: `D,D,D,D,D,D,D,D,H,H`; 11: `D,D,D,D,D,D,D,D,D,H`.
- 12: `H,H,S,S,S,H,H,H,H,H`; 13–16: `S,S,S,S,S,H,H,H,H,H`; 17+: S all.
- LS overlay (initial non-pair two-card hand): 15 v T = R; 16 v 9/T/A = R. If LS absent, use the hard-table underlying action.

Soft rows:
- A2/A3: `H,H,H,D,D,H,H,H,H,H`; A4/A5: `H,H,D,D,D,H,H,H,H,H`; A6: `H,D,D,D,D,H,H,H,H,H`.
- A7 (soft 18): `S,DS,DS,DS,DS,S,S,H,H,H`; A8/A9: S all.

**S17 DAS/no-DAS affects pairs, not the above non-pair total matrix.** (It can affect the action taken from an original pair; do pairs before total lookup.) Pair priorities: AA/88 split all; TT/55 never; 22/33 split 4–7, additionally 2–3 only with DAS; 44 split 5–6 only with DAS; 66 split 3–6, additionally 2 only with DAS; 77 split 2–7; 99 split 2–6 and 8–9. Otherwise evaluate as hard total.

### Every H17 vs S17 difference (4–8D)
Apply these deltas to the S17 baseline; all other hard/soft cells unchanged:
1. Hard 11 v A: `H → D` (fallback H).
2. Soft A7/18 v 2: `S → DS`.
3. Soft A8/19 v 6: `S → DS`.
4. LS overlay: add 15 v A = R; add hard 17 v A = R; on pair 88 v A use `R` before split (`RP` in BlackjackInfo notation: surrender, split if surrender unavailable). Existing 16 v 9/T/A and 15 v T remain R.

Wizard independently lists precisely these H17 modifications (including 15/88/17 vs A and double 11-v-A, soft-18-v-2, soft-19-v-6); BJA’s S17/H17 PDFs confirm the total-cell changes and R cells.

### Double rule variants
Run the selected double rule as an availability mask on every `D`/`DS` cell; retain the indicated fallback.
- **Any two:** all listed D/DS cells available on the eligible two-card hand.
- **9–11 only:** hard 9/10/11 D cells available; every soft D/DS unavailable, so resolve D→H and DS→S. (Thus H17 A7-v2 becomes S and A8-v6 S.)
- **10–11 only:** hard 10/11 D cells available; hard 9 D cells become H; every soft D/DS resolves to fallback.

### Two-card/multi-card and precedence semantics
- Double and late surrender are first-decision/two-card actions; split is only for a starting pair. A multi-card total cannot use R/D/DS. Resolve it with fallback: hard <=11 H; hard 12 S only v4–6; hard 13–16 S only v2–6; hard 17+ S; soft <=17 H; soft 18 S v2–8/H v9–A; soft 19+ S.
- Recommended evaluator precedence: **(1) late surrender (where its cell says R), (2) split pair, (3) total table with double availability/fallback, (4) hit/stand.** Critical H17 exception: 88 v A is R if LS exists, otherwise P; do not apply generic hard-16 surrender after skipping pair logic.
- If re-split is barred, Wizard says look up hard total except AA. If draw-to-split-aces is permitted and unsplittable AA occurs, double v6; otherwise hit. This is a rule-model edge case beyond the listed app toggles.

## Claims requiring cross-reference / implementation caution
- BlackjackInfo’s default rendered chart was **6D H17 DAS no-surrender peek**; its URL controls expose decks 1–8, S17/H17, all/9–11/10–11 doubling, DAS, surrender and peek/no-peek. It is the best source for generating all app combinations, but research should cross-check every generated 1D/2D configuration separately: the Wizard source here establishes only the shared **4–8D** table.
- The BJA PDFs are conventional multi-deck cards and do not state every assumption (deck count, peek, DAS) in their extracted text. Use them as confirmation, not the sole source for rule-specific edge cases.
- “DAS/no-DAS does not alter non-pair total cells” is valid for the presented 4–8D total strategy; actual post-split hands should be modeled as new two-card hands, with double permission controlled by DAS.
- App supports no-surrender/late-surrender only; do not import BlackjackInfo’s early-surrender cells despite its UI exposing that option.
- 1/2-deck exact tables are outside this multi-deck finding. Do not silently reuse the 4–8D table if the product requires exact 1D/2D behavior; use the BlackjackInfo rule engine or separately sourced deck-specific tables.

## Source quality
1. **Wizard of Odds (Michael Shackleford)**: highest quality here; dedicated 4–8D page, explicit S17 baseline and H17 deltas, rules/edge-case text. Lines 55–65, 135–149, 269–293 in saved file.
2. **BlackjackInfo engine (Ken Smith)**: strong established configurable strategy engine; directly supports all app controls and defines `D`/`DS` fallback. Lines 5–72 and 76–82.
3. **Blackjack Apprenticeship PDFs**: useful published visual reference/cross-check; clear matrices and legend but assumptions less explicit.
4. Search-only supporting sources (not fetched): Wizard calculator https://wizardofodds.com/games/blackjack/strategy/calculator and Wizard expected-values appendix https://wizardofodds.com/games/blackjack/expected-values/ . These provide at least five distinct source URLs overall, but should be fetched/cited before treating as primary evidence.

## Gaps
No source fetched/generated an exhaustive 1D/2D matrix for every combination. Also app-level rules not listed (resplit cap, hit/stand split aces, RSA, double split aces) can change pair/re-split outputs and need explicit product rule definitions.