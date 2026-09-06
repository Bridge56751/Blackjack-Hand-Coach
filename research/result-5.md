## Key facts / implementable findings

**Scope and rule identity.** Treat this as **120 distinct US-peek configurations**: `decks ∈ {1,2,4,6,8} × dealerSoft17 ∈ {S17,H17} × DAS ∈ {yes,no} × doubleRule ∈ {anyTwo,9to11,10to11} × lateSurrender ∈ {none,late}`. The BlackjackInfo generator explicitly exposes exactly these controls plus `Peek (US style)`/`No peek (Euro)` and renders hard, soft, and pair charts: https://www.blackjackinfo.com/blackjack-basic-strategy-engine/ . Its chart legend gives required fallback semantics: `D = double, hit if not allowed`; `DS = double, stand if not allowed`; therefore store **ordered actions**, not a single irreversible action.

**Table representation.** Use three decision matrices, selected in this order:
1. `pairs[pairRank][dealerUpcard]` (including `8,8`, never let hard-16 overwrite it);
2. `soft[softTotal][dealerUpcard]` for two-card ace hands;
3. `hard[total][dealerUpcard]`.
Each cell should be ordered actions, e.g. `['surrender','split']` (RS), `['double','stand']` (DS), `['double','hit']` (DH), `['stand']`, `['hit']`; the game layer chooses the first legal action. Surrender is legal only on the initial two-card hand **after the dealer has peeked and found no blackjack**. Double is legal only on a two-card hand, subject to the selected restriction and DAS status. This avoids the common incorrect treatment of “double any two” as double on any later total.

**Exact late-surrender total-dependent overlay (US hole-card/peek, after no dealer blackjack).** Upcards shown as `9,T,A`; all omitted cells are no surrender. Source: Wizard of Odds, https://wizardofodds.com/games/blackjack/surrender/.

| decks | S17 surrender cells | H17 surrender cells |
|---|---|---|
| 1 | hard 16 vs T,A | hard 15 vs A; hard 16 vs T,A; hard 17 vs A |
| 2 | hard 15 vs T; hard 16 vs T,A | hard 15 vs T,A; hard 16 vs T,A; hard 17 vs A |
| 4, 6, 8 | hard 15 vs T; hard 16 vs 9,T,A | hard 15 vs T,A; hard 16 vs 9,T,A; hard 17 vs A |

“Hard 16” in that source means 10+6 or 9+7; **8,8 is a separate pair row**. Pair exception: with late surrender and H17, `8,8 vs A` is `['surrender','split']` for 4/6-deck composition tables; BlackjackInfo independently shows `RP` (surrender, split if unavailable) for its 8-deck H17/late-surrender chart. For **2-deck H17**, Wizard specifies surrender `8,8 vs A` only when DAS is *not* allowed; do not flatten this DAS-sensitive pair cell into hard-16. Wizard also states the 8-deck surrender strategy is composition-independent, strengthening it as a total-dependent oracle.

**Useful stable baseline cells.** The generator’s default shown chart is 6-deck/H17/any-two/DAS/no-surrender/peek: hard 9 D vs 3–6, hard 10 D vs 2–9, hard 11 D vs 2–A; soft 18 `DS` vs 2–6, S vs 7–8, H vs 9–A; 9,9 split vs 2–6 and 8–9 but stand vs 7,T,A. These are useful smoke cells, not a substitute for every configuration.

**Rule effects are material enough to require configuration-specific output.** Wizard quantifies, after proper strategy adjustment, H17 −0.22%, no-DAS −0.14%, double 9–11 only −0.09%, double 10–11 only −0.18%, and deck effects vs its 8-deck baseline (1D +0.48%, 2D +0.19%, 4D +0.06%, 6D +0.02%). It also documents late surrender vs T +0.07% and its baseline assumptions (8D/S17/any-two/DAS/split-to-4): https://wizardofodds.com/games/blackjack/rule-variations/.

## Reliable regression-oracle plan

1. Fix rule contract beyond UI inputs: US dealer hole card; peek for both T and A before player acts; blackjack payout, split cap/resplit aces, hit/split aces, and surrender-after-split. These can change pair EV/action cells.
2. Export all 120 charts from BlackjackInfo using its parameterized engine; normalize `H/S/D/DS/P/RP` to the ordered-action encoding above; commit JSON plus rule metadata and source URL/config string. It is a strong independent chart oracle, but preserve raw exports and version/date.
3. Independently calculate action EVs with an exhaustive finite-shoe dynamic-programming solver, then compare argmax *and* EV margin. Near-ties should be reported/toleranced rather than silently “corrected.” Wizard’s expected-value appendices are a second authoritative check: https://wizardofodds.com/games/blackjack/expected-values/ and infinite-deck/action-EV reference https://wizardofodds.com/games/blackjack/expected-return-infinite-deck/.
4. Add deterministic golden tests for every cell, explicitly testing fallbacks and illegal-action suppression (no surrender after hit/split; no double after a third card; no DAS on split children).

## Claims requiring cross-reference / gaps

* The Wizard surrender matrices are authoritative for surrender decisions but do **not** publish all 120 hard/soft/pair matrices across the requested doubling restrictions/DAS choices; use generated full charts plus an independent EV solver rather than infer changes from the small rule-effect percentages.
* “Total-dependent” must mean the initial dealt total/pair category with a full-shoe distribution. It is not composition-dependent perfect play. Wizard documents that exact composition can alter 1D/2D actions, so a finite-shoe exhaustive solver must deliberately aggregate by total if the app promises total-dependent charts.
* No-peek/ENHC is out of scope and must never reuse these US matrices: Wizard says no-peek T/A dealer blackjack can expose doubled/split wagers, with different costs and strategy. https://wizardofodds.com/games/blackjack/rule-variations/.
* Open-source cross-check available: https://github.com/AttackingOrDefending/Blackjack-Strategy-Simulator supports deck count, S17/H17, DAS, peek/no-peek, surrender, configurable chart generation and CSV. It labels itself combinatorial/Monte-Carlo and explicitly cautions not to base strategy on it; it is suitable as a tertiary differential oracle, **not** the authority. Its `effort=5` caveat and split truncation make this important.

## Source quality

* **High:** Wizard of Odds (Michael Shackleford): explicit assumptions, quantified EV deltas, US/no-peek distinctions, published surrender cells and EV appendices.
* **High/medium:** BlackjackInfo (Ken Smith): directly configurable chart engine matching the requested UI dimensions; ideal fixture generator, but methodology/full static exports are not published.
* **Medium:** cited open-source simulator: inspectable and configurable, but author disclaims full accuracy.

## Saved sources

* `research/sources/blackjackinfo-strategy-engine.md`
* `research/sources/wizard-rule-variations.md`
* `research/sources/wizard-surrender.md`
* `research/sources/github-strategy-simulator.md`