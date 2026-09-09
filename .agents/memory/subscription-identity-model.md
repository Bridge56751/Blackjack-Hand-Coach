---
name: Subscription identity model
description: Defines how Blackjack Coach identifies customers and grants High Roller access.
---

Use the Apple/Google store-account model without requiring a Blackjack Coach login. Do not call RevenueCat account login/logout methods or add a separate app-account identity unless the product decision is explicitly changed.

High Roller access must come only from the exact active RevenueCat entitlement. Never persist a premium flag or accept another client or server claim as an entitlement source.

Production authorization must fail closed: require fresh, trusted RevenueCat information, isolate Test Store access to development, and never let an expired or older entitlement snapshot reauthorize access. It is acceptable for premium access to be temporarily unavailable offline.

**Why:** The chosen experience avoids app accounts while letting the platform store account restore purchases across devices. A second identity or stale/offline entitlement source could merge customers incorrectly or grant access after an entitlement expires.

**How to apply:** Keep purchases, restores, foreground refreshes, and all premium gates tied to fresh RevenueCat customer information. Default to locked whenever authoritative entitlement data is unavailable.