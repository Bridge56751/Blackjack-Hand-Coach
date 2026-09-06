Research complete. I ran 4 distinct searches and fetched 4 primary pages (saved below). Key finding: no published static chart can safely be treated as an exact table for the app’s entire rule Cartesian product; BlackjackInfo’s rule-selectable strategy engine is the best machine-source cross-check and explicitly supports 1–8 decks, S17/H17, any-two/9–11/10–11 doubling, DAS/no-DAS, late/no surrender, and US peek. Wizard’s calculator independently supports deck group, S17/H17, DAS, surrender, and peek, but not the app’s double restriction selector.

Machine-readable baseline pair matrices (US peek, double-any-two, *no surrender*; columns dealer 2 3 4 5 6 7 8 9 T A; P split, H hit, S stand, D double-or-hit). These are total-dependent initial-pair actions—not post-split play.

**1 deck, S17, DAS**
22 PPPPPPHHHH; 33 PPPPPPPHHH; 44 HHPPPHHHHH; 55 DDDDDDDDHH; 66 PPPPPPHHHH; 77 PPPPPPPHSH; 88 PPPPPPPPPP; 99 PPPPPSPPSS; TT SSSSSSSSSS; AA PPPPPPPPPP.
This is directly transcribed from Wizard calculator.

**4/6/8 decks, S17, DAS** (BlackjackInfo’s 6D output; Wizard’s traditional chart groups 4+):
22/33 PPPPPPHHHH; 44 HHHPPHHHHH; 55 DDDDDDDDHH; 66 PPPPPHHHHH; 77 PPPPPPHHHH; 88 PPPPPPPPPP; 99 PPPPPSPPSS; TT SSSSSSSSSS; AA PPPPPPPPPP.

**4/6/8 decks, H17, DAS**: same as preceding except 44 = HHPPPHHHHH (split 4,4 vs 4–6). This is the material H17 pair change under these baseline conditions.

**DAS disabled, standard multi-deck family, S17**:
22/33 HHPPPPHHHH (split 4–7); 44 HHHHHHHHHH; 55 DDDDDDDDHH; 66 HPPPPHHHHH (3–6); 77 PPPPPPHHHH; 88 all P; 99 PPPPPSPPSS; TT all S; AA all P.
**DAS disabled, standard multi-deck family, H17**:
22/33 HPPPPPHHHH (3–7); 44 all H; 55 DDDDDDDDHH; 66 PPPPPHHHHH (2–6); 77 PPPPPPHHHH; 88 all P; 99 PPPPPSPPSS; TT all S; AA all P.

These no-DAS family matrices and the H17/single-deck edge cells must be regenerated from the strategy engine per exact rule selection before production adoption; sources fetched only expose one live default response, not a static all-configuration corpus. I would not present them as fully verified exact app data.

**Cell-level deviations / implementation rules**
- Initial 5,5 is never a split: route it through hard-10. With all three app doubling policies, hard 10 may still double 2–9, so its pair action is generally unchanged; encode it as `hardTotal(10)`, not a fixed pair rule.
- Initial T,T is stand and 9,9 is split 2–6, 8–9; stand 7, T, A in normal charts.
- Late surrender is an *initial-choice precedence*, not merely a fallback. The important pair cell is 8,8 vs A: `R/P` (surrender; if surrender unavailable, split) in the common multi-deck H17+LS configuration documented in BlackjackInfo’s comments. Treat exact S17 and low-deck applicability as a generated/cross-checked cell, not a universal rule.
- If a pair cell says not split, resolve by total: 2,2→hard 4; 3,3→6; 4,4→8; 5,5→10; 6,6→12; 7,7→14; 8,8→16; 9,9→18; T,T→20. Do not use a generic hit fallback (e.g., 9,9 holds vs 7/T/A).
- A,A is split in normal basic strategy. The rules source confirms split aces receive one card, split-A 21 is not blackjack, and resplit aces is a separate table rule.

**Resplit aces conclusion:** it is not merely downstream in an exact optimizer: whether an A drawn after splitting may be resplit changes the continuation EV, so it can theoretically affect the initial AA split comparison. In ordinary US basic strategy AA remains split regardless; however, do not assume invariance in code or use an initial-pair table generated under RSA when table RSA differs. It directly changes post-split action availability, and should be an explicit solver/table dimension. Split limit (usually up to four hands) is another required dimension.

**Claims requiring cross-reference / gaps**
1. Exact 1/2/4/6/8 × S17/H17 × DAS × three double policies × LS/no-LS tables require exporting/querying the BlackjackInfo engine (or a validated in-house DP solver) for every configuration. Neither fetched static Wizard chart covers doubling 9–11/10–11.
2. Need explicitly settle game implementation assumptions: max split hands, resplit non-aces, RSA, hit/stand split aces, DAS after split aces, and whether LS after a split is prohibited (normally initial two cards only). These alter true split EV.
3. “Exact” here means total-dependent, not composition-dependent. Wizard links distinct 1D/2D composition-dependent exception appendices; do not silently label a total chart composition-optimal.

**Source quality**
- High: Wizard of Odds (Michael Shackleford), explicit chart/calculator and formal blackjack appendices.
- High: BlackjackInfo engine (Ken Smith), transparent live rule selectors; it is the only fetched source matching every core app selector except RSA/split limits.
- Medium: Wizard’s older 1/2/4+ static-chart grouping is useful confirmation but insufficient to prove every 4/6/8 cell is identical.

**Sources (5 distinct URLs; 4 saved fetched pages)**
1. https://wizardofodds.com/games/blackjack/strategy/calculator/ — `research/sources/wizard-blackjack-calculator.md`
2. https://www.blackjackinfo.com/blackjack-basic-strategy-engine — `research/sources/blackjackinfo-strategy-engine.md`
3. https://wizardofodds.com/games/blackjack/basics/ — `research/sources/wizard-blackjack-basics.md`
4. https://wizardofodds.com/games/blackjack/strategy/8-decks/ — `research/sources/wizard-8-deck-strategy.md`
5. https://wizardofodds.com/games/blackjack/strategy/4-decks/ — linked as the 4+ static-chart family by Wizard; not fetched to respect requested 2–4 fetch limit.

Useful direct citations: Wizard calculator lines 82–92 shows inputs and baseline; 123–140 supplies exact 1D S17 DAS pair rows/legend. BlackjackInfo saved file lines 5–15 documents all app-relevant selectors, 57–72 provides its live 6D H17 DAS no-surrender pair output, and 78–82 describes selected-rule optimal strategy. Wizard basics lines 57–70 defines US peek, split, split-ace, resplit, surrender, and dealer rules.