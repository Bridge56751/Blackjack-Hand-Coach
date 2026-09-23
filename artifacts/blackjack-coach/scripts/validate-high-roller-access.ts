import {
  EMPTY_HIGH_ROLLER_ACCESS_STATE,
  evaluateHighRollerAccess,
  HIGH_ROLLER_OFFLINE_WINDOW_MS,
} from '../lib/high-roller-access-policy.ts';
import type {
  HighRollerAccessState,
  HighRollerCustomerSnapshot,
} from '../lib/high-roller-access-policy.ts';

function equal<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const HOUR = 60 * 60_000;
const ENTITLEMENT = 'com_howtoplayblackjack_app_High_Roller';
const start = Date.parse('2026-01-01T00:00:00.000Z');

function snapshot(
  requestMs: number,
  expirationMs: number | null = requestMs + 30 * 24 * HOUR,
): HighRollerCustomerSnapshot {
  return {
    requestDate: new Date(requestMs).toISOString(),
    entitlementsVerification: 'VERIFIED',
    entitlement: {
      identifier: ENTITLEMENT,
      isActive: true,
      verification: 'VERIFIED',
      expirationDate: expirationMs === null ? null : new Date(expirationMs).toISOString(),
      isSandbox: false,
      store: 'APP_STORE',
    },
  };
}

function evaluate(
  state: HighRollerAccessState,
  info: HighRollerCustomerSnapshot | undefined,
  nowMs: number,
) {
  return evaluateHighRollerAccess(state, info, nowMs, true);
}

// Cold start accepts RevenueCat's persisted verified CustomerInfo without a
// separate local receipt cache or a preliminary network/cache invalidation.
const coldStart = evaluate(EMPTY_HIGH_ROLLER_ACCESS_STATE, snapshot(start), start + HOUR);
equal(coldStart.authorized, true, 'verified SDK cache should authorize cold start');

const justInside = evaluate(
  EMPTY_HIGH_ROLLER_ACCESS_STATE,
  snapshot(start, null),
  start + HIGH_ROLLER_OFFLINE_WINDOW_MS - 1,
);
equal(justInside.authorized, true, '36-hour boundary should be exclusive');
const atBoundary = evaluate(
  EMPTY_HIGH_ROLLER_ACCESS_STATE,
  snapshot(start, null),
  start + HIGH_ROLLER_OFFLINE_WINDOW_MS,
);
equal(atBoundary.authorized, false, 'access must end exactly at 36 hours');

const shortExpiry = evaluate(
  EMPTY_HIGH_ROLLER_ACCESS_STATE,
  snapshot(start, start + 2 * HOUR),
  start + HOUR,
);
equal(shortExpiry.state.authorizationDeadlineMs, start + 2 * HOUR, 'known expiry must cap access');
equal(
  evaluate(shortExpiry.state, undefined, start + 2 * HOUR).authorized,
  false,
  'known entitlement expiry must be exclusive',
);

const repeatedCache = evaluate(coldStart.state, snapshot(start), start + 12 * HOUR);
equal(
  repeatedCache.state.authorizationDeadlineMs,
  coldStart.state.authorizationDeadlineMs,
  'offline refresh must not extend the requestDate-based deadline',
);

const revoked = evaluate(repeatedCache.state, {
  requestDate: new Date(start + 13 * HOUR).toISOString(),
  entitlementsVerification: 'VERIFIED',
}, start + 13 * HOUR);
equal(revoked.authorized, false, 'newer verified missing entitlement must revoke immediately');

const renewed = evaluate(EMPTY_HIGH_ROLLER_ACCESS_STATE, snapshot(start + 10 * HOUR), start + 11 * HOUR);
const same = evaluate(renewed.state, snapshot(start + 10 * HOUR), start + 12 * HOUR);
equal(same.state.authorizationDeadlineMs, renewed.state.authorizationDeadlineMs, 'same response cannot extend');
const older = evaluate(same.state, snapshot(start + 5 * HOUR), start + 13 * HOUR);
equal(older.state.latestRequestMs, renewed.state.latestRequestMs, 'out-of-order response must be ignored');
const expiredOlder = evaluate(older.state, snapshot(start - 40 * HOUR), start + 14 * HOUR);
equal(expiredOlder.state.latestRequestMs, renewed.state.latestRequestMs, 'expired older response cannot reauthorize');

const failedVerification = snapshot(start + 20 * HOUR);
failedVerification.entitlement!.verification = 'FAILED';
equal(
  evaluate(renewed.state, failedVerification, start + 20 * HOUR).authorized,
  false,
  'failed entitlement verification must fail closed',
);
const failedAggregateVerification = snapshot(start + 20 * HOUR);
failedAggregateVerification.entitlementsVerification = 'FAILED';
equal(
  evaluate(renewed.state, failedAggregateVerification, start + 20 * HOUR).authorized,
  false,
  'failed CustomerInfo verification must fail closed',
);

const wrongEntitlement = snapshot(start);
wrongEntitlement.entitlement!.identifier = 'some_other_entitlement';
equal(
  evaluate(EMPTY_HIGH_ROLLER_ACCESS_STATE, wrongEntitlement, start + HOUR).authorized,
  false,
  'wrong entitlement must fail closed',
);
equal(
  evaluate(EMPTY_HIGH_ROLLER_ACCESS_STATE, snapshot(start + HOUR), start).authorized,
  false,
  'future requestDate must fail closed',
);
const invalidExpiration = snapshot(start);
invalidExpiration.entitlement!.expirationDate = 'not-a-date';
equal(
  evaluate(EMPTY_HIGH_ROLLER_ACCESS_STATE, invalidExpiration, start + HOUR).authorized,
  false,
  'invalid expirationDate must fail closed',
);
const invalidRequest = snapshot(start);
invalidRequest.requestDate = 'not-a-date';
equal(
  evaluate(EMPTY_HIGH_ROLLER_ACCESS_STATE, invalidRequest, start + HOUR).authorized,
  false,
  'invalid requestDate must fail closed',
);
equal(
  evaluateHighRollerAccess(EMPTY_HIGH_ROLLER_ACCESS_STATE, snapshot(start), start, false).authorized,
  false,
  'web, Expo Go, development, and other non-production-native runtimes must fail closed',
);

const beforeRollback = evaluate(EMPTY_HIGH_ROLLER_ACCESS_STATE, snapshot(start), start + 2 * HOUR);
const rolledBack = evaluate(beforeRollback.state, undefined, start + HOUR);
equal(rolledBack.authorized, false, 'in-process wall-clock rollback must fail closed');
equal(
  evaluate(rolledBack.state, snapshot(start + 3 * HOUR), start + 4 * HOUR).authorized,
  false,
  'clock rollback failure must remain sticky for the process lifetime',
);

console.log('High Roller access policy regression checks passed.');