# Single-deck Hi-Lo source verification

Research date: 2026-09-23

## Outcome

Blocked on source verification, not implemented. No accessible source examined supplied a complete, authoritative single-deck index table together with its rule scope, count conversion convention, and actions on both sides of each threshold. This does not mean such tables do not exist.

Single-deck remains on Basic Strategy. Do not reuse the BJA multideck or Schlesinger double-deck profile. No new thresholds, profile identifiers, UI availability, or report provenance were introduced.

## Sources examined and actionable leads

- [QFIT: Hi-Lo](https://www.qfit.com/cardcounting/Hi-Lo): identifies Stanford Wong's *Professional Blackjack* (1975, revised 1994) as its source and explicitly warns that indices differ by edition. The page provides count tags, not a single-deck index matrix or its decision conventions.
- [Professional Blackjack catalog entry](https://www.blackjackreview.com/wp/catalog/professional-blackjack/): confirms the book is a substantial strategy reference with over 100 tables. The fetched catalog page is not the tables; it cannot substantiate individual indices.
- [BlackjackInfo: about Hi-Lo indices](https://www.blackjackinfo.com/community/threads/about-hi-lo-indices.11879/): identifies *Blackjack Attack*, third edition, Table 10.1, page 213, as a possible source containing deck-specific simulation indices. The discussion states that Chapter 10 uses flooring and that Wong's original rounding convention later changed to truncation. These are source leads, not a verified transcription of the single-deck column and accompanying rule assumptions. Do not combine a forum rounding statement with an unrelated table.
- [Ken Smith's BlackjackInfo strategy cards](https://www.blackjackinfo.com/card/): advertises advanced Hi-Lo cards covering the same six deck/soft-17 configurations as the basic cards, with indices from -5 to +5. The publisher's response specifies flooring, including negative counts. This is a promising source to obtain, but the fetched page does not expose the full single-deck cards, legends, rule exceptions, and both decision directions.
- [Wizard of Odds single-deck strategy](https://wizardofodds.com/games/blackjack/strategy/1-deck/): existing project research covers basic/composition-dependent strategy. That material is not a verified Hi-Lo threshold source.

Searches also returned public BJA S17/H17 deviation sheets and six-deck tools. These cannot establish single-deck values.

## Required evidence to unblock

Obtain a legitimate readable copy of the relevant single-deck cards or book pages, including their legends and methodology, not just isolated numeric cells. Verify:

1. Edition, author, table/card identifier, and single-deck designation.
2. S17/H17, DAS/NDAS, double restrictions, surrender, hole-card/peek treatment, and any other applicable restrictions.
3. True-count divisor/deck estimation and floor/truncate/round convention, including negative and zero boundaries.
4. Actions below, at, and above every selected threshold, plus insurance and unavailable-action handling where covered.
5. Whether values are total-dependent or composition-dependent and whether they optimize expected value or risk.

Only then implement a separately identified profile, exact support gating, UI availability, report provenance, and independent boundary/legal-action fixtures. Unsupported combinations must continue to normalize to Basic Strategy.

## Existing safety boundary

`getHiLoIndexSupport` in `artifacts/blackjack-coach/lib/rules.ts` returns unsupported for one deck; normalization resets a requested index mode to Basic Strategy. The existing `scripts/validate-hilo-index.ts` includes the single-deck unsupported assertion. Existing application code was left unchanged during this research.

## Workspace scope and validation

The working tree already contained application changes when inspected, including double-deck grading, subscription authorization, and session/settings UI changes. Those are not outputs of this research and were not reverted or modified here. The changes made for this research are this report and the count-index memory guidance/index.

The existing Hi-Lo regression script passed with `node --experimental-strip-types scripts/validate-hilo-index.ts` from the mobile artifact directory. Completion review also reported passing configured checks, but flagged the pre-existing subscription policy for rejecting development/Test Store authorization and native store sandbox entitlements. Those findings remain unresolved by this source-research task and must not be interpreted as subscription approval.