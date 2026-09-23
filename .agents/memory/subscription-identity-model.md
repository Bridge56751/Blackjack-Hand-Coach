---
name: Subscription identity model
description: Defines how Blackjack Coach identifies customers and grants High Roller access.
---

Use the Apple/Google store-account model without requiring a Blackjack Coach login. Do not call RevenueCat account login/logout methods or add a separate app-account identity unless the product decision is explicitly changed.

High Roller access must come only from the exact active RevenueCat entitlement. Never persist a premium flag or accept another client or server claim as an entitlement source.

Production authorization permits the user-approved 36-hour offline window from trusted RevenueCat request time, capped by known entitlement expiry. Repeated cached responses must not extend it; newer verified revocation removes access. Keep Test Store excluded from production.

**Why:** The chosen experience avoids app accounts while letting the platform store account restore purchases across devices. The user explicitly chose 36 hours of offline premium play, replacing the earlier online-only requirement without adding a second entitlement authority.

**How to apply:** Keep purchases, restores, foreground refreshes, and all premium gates tied to RevenueCat customer information. Preserve its SDK cache for offline starts; do not persist a parallel premium flag. Lock when trusted cached authorization is absent or its window expires. Do not promise tamper-proof offline expiry across process restarts: wall-clock checks alone cannot guarantee that.