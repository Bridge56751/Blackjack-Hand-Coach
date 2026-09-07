---
name: RevenueCat project isolation
description: Why a separate RevenueCat project must exist before it can be configured through the Replit connection.
---

RevenueCat connections are scoped to projects that already exist. Do not reuse an unrelated project's connection or catalog when adding billing for a different app.

**Why:** Even a connection reporting full project configuration permissions could list and configure its current project but RevenueCat rejected creating a new top-level project. Reauthorization did not change that boundary.

**How to apply:** Have the user create the separate RevenueCat project first, then connect that project in Replit. Verify the connected project name before making any catalog writes.