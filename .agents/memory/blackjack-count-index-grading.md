---
name: Count-index grading scope
description: Source, support boundary, and count-snapshot rules for Blackjack Coach count-adjusted grading.
---

Count-adjusted grading uses an exact application profile of the public 2018 Blackjack Apprenticeship H17/S17 Deviation Charts for 4-, 6-, and 8-deck American-peek games. Unsupported 1- and 2-deck tables must grade as basic strategy and must not be labeled as index-graded.

**Why:** Hi-Lo indices vary by deck count and rules. Reusing multideck thresholds outside their sourced scope would present false precision, while mixing no-surrender hard-total overlays into late-surrender decisions would override the source chart's surrender priority.

**How to apply:** Keep live count visibility independent from grading mode. In index mode, maintain the count even when hidden and snapshot RC/TC immediately before each decision. Exclude the dealer hole card from RC until reveal, but include it among unseen cards for TC.