Research complete. Ran 4 targeted searches and fetched 3 source pages.

Saved sources:
- research/sources/gapfill-wizard-1deck.md — Michael Shackleford / Wizard of Odds, 1D charts and US-peek appendix links: https://wizardofodds.com/games/blackjack/strategy/1-deck/
- research/sources/gapfill-wizard-2deck.md — Shackleford, 2D charts: https://wizardofodds.com/games/blackjack/strategy/2-decks/
- research/sources/gapfill-blackjackinfo-engine.md — Ken Smith / BlackjackInfo generator: https://www.blackjackinfo.com/blackjack-basic-strategy-engine

High-confidence cross-check findings (US peek; totals, not composition-dependent):
- BlackjackInfo explicitly supports all required independent rule controls: decks 1–8, S17/H17, double any-two / 9–11 / 10–11, DAS/no-DAS, no/late/early surrender, and peek/no-peek. Its URL parameters are numdecks, soft17, dbl, das, surr, peek. Key: D = double/hit if unavailable; DS = double/stand if unavailable; P = split.
- Baseline engine chart confirms hard 8 always H; hard 9 D vs 3–6 (H elsewhere); hard 11 D vs 2–T and, under H17, also A. The page’s prose states S17 exception: 11 vs A is not doubled; H17 doubles it. These are explicitly generic rules, so re-query the engine for 1D/2D boundary cells rather than applying 6D output blindly.
- Soft 18: D/DS vs 3–6, S vs 2/7/8, H vs 9/T/A in the default H17 chart. Soft 19: S except DS vs 6 under H17. This is one of the consequential S17/H17 switches.
- 7,7 vs T: BlackjackInfo specifically says **single deck = stand** because of removal effects (source line 796); this is a material 1D deviation from ordinary pair charts. Do not simplify it to “always hit” or use a generic multideck row.
- DAS-specific pair cells: 4,4 splits only vs 5–6 with DAS; otherwise H. Generic DAS pair rows: 2,2 and 3,3 P vs 2–7; 6,6 P vs 2–6; 7,7 P vs 2–7. Therefore no-DAS needs separately generated rows, especially 2/3/6 pairs—do not carry over DAS cells.
- Restricted doubling: engine notation directly encodes fallback: D→H when double unavailable, DS→S. This is essential for soft 18/19 and all low-total doubles under 9–11 / 10–11 restrictions.
- Late-surrender guidance published by BlackjackInfo: surrender hard 16 vs 9–A; surrender 15 vs T, plus A under H17. Pair cells can be conditional: the engine’s documented RP notation means surrender, split if surrender is unavailable (confirmed in engine discussion for 8,8 vs A under H17/DAS/LS). This must not be flattened into unconditional P or R.
- Wizard provides the strongest mathematical corroboration. Its 2D S17 page records a genuine total-vs-two-card conflict for A,7 vs A: for exactly two cards hit EV −0.100359 narrowly exceeds stand −0.100502, but all-card-count simulation supports **stand**; this is why chart convention matters. It credits Don Schlesinger. Wizard also says when a re-split is barred, play the result as a hard total except aces (then D vs 5/6 if drawing to split aces allowed, else H).

Source quality:
- Highest: Wizard of Odds / Michael Shackleford (named mathematician, chart images plus dedicated US-peek and exact-composition appendices). Appendix links in saved files: 1D S17 3a, 2D S17 3b, 1D H17 3c; surrender Appendix 6.
- Strong implementation cross-check: BlackjackInfo / Ken Smith (named engine author; live rule-parametric generator). Its fetched document only renders its default 6D H17 DAS/no-surrender/peek table server-side, so 1D/2D variants require generator parameter selection.

Unresolved / avoid overstating:
- The fetched text did not expose the rendered 1D/2D table matrices or chart-image OCR, so I cannot certify every requested deck-specific S17/H17 × DAS/no-DAS × surrender × doubling cell from this pass.
- In particular, query the engine before locking 1D/2D borderline 9-vs-2, 11-vs-A, no-DAS 2/3/6-pair rows, and late-surrender conditional pair cells. Also preserve Wizard’s soft-18-vs-A S17 all-card-count convention rather than treating two-card EV alone as chart strategy.
