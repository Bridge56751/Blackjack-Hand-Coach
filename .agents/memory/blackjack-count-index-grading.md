---
name: Count-index grading scope
description: Source, support boundary, and count-snapshot rules for Blackjack Coach count-adjusted grading.
---

Never extrapolate the BJA multideck thresholds to small decks. Double-deck coverage must use the separately sourced Schlesinger/Brolley Table 31.2 profile and its exact rule scope; single-deck remains unsupported until a verified source is obtained.

**Why:** Hi-Lo indices vary by deck count and rules. Reusing multideck thresholds outside their sourced scope would present false precision, while mixing no-surrender hard-total overlays into late-surrender decisions would override the source chart's surrender priority.

**How to apply:** Keep live count visibility independent from grading mode. In index mode, maintain the count even when hidden and snapshot RC/TC immediately before each decision. Exclude the dealer hole card from RC until reveal, but include it among unseen cards for TC.

For two-sided index tables, encode the action below the threshold explicitly rather than falling back to basic strategy.

**Why:** Basic strategy may already recommend the above-threshold action (for example, standing on hard 12 against 4), so a generic fallback silently erases negative-count deviations. Regression expectations must be independent of that fallback.

**How to apply:** Verify both sides and exact boundaries of each index, its count-rounding convention, and legal-action fallbacks.