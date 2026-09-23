export const HIGH_ROLLER_OFFLINE_WINDOW_MS = 36 * 60 * 60_000;

export type VerificationResult =
  | 'FAILED'
  | 'NOT_REQUESTED'
  | 'VERIFIED'
  | 'VERIFIED_ON_DEVICE';

export type HighRollerEntitlementSnapshot = {
  identifier: string;
  isActive: boolean;
  verification: VerificationResult;
  expirationDate: string | null;
  isSandbox: boolean;
  store: string;
};

export type HighRollerCustomerSnapshot = {
  requestDate: string;
  entitlementsVerification: VerificationResult;
  entitlement?: HighRollerEntitlementSnapshot;
};

export type HighRollerAccessState = {
  latestRequestMs: number;
  authorizationDeadlineMs: number;
  expirationWatermarkMs: number;
  lastObservedNowMs: number;
  clockRollbackDetected: boolean;
};

export type HighRollerAccessDecision = {
  state: HighRollerAccessState;
  authorized: boolean;
  reason:
    | 'active'
    | 'clock-rollback'
    | 'expired'
    | 'future-request'
    | 'inactive'
    | 'invalid-expiration'
    | 'invalid-request'
    | 'invalid-runtime'
    | 'out-of-order'
    | 'sandbox'
    | 'unverified'
    | 'wrong-entitlement';
};

export const EMPTY_HIGH_ROLLER_ACCESS_STATE: HighRollerAccessState = {
  latestRequestMs: 0,
  authorizationDeadlineMs: 0,
  expirationWatermarkMs: 0,
  lastObservedNowMs: 0,
  clockRollbackDetected: false,
};

function isVerified(result: VerificationResult): boolean {
  return result === 'VERIFIED' || result === 'VERIFIED_ON_DEVICE';
}

function currentDecision(
  state: HighRollerAccessState,
  nowMs: number,
  reason: HighRollerAccessDecision['reason'],
): HighRollerAccessDecision {
  return {
    state,
    authorized: state.authorizationDeadlineMs > nowMs && !state.clockRollbackDetected,
    reason: state.authorizationDeadlineMs > nowMs && !state.clockRollbackDetected ? 'active' : reason,
  };
}

/**
 * Applies one RevenueCat CustomerInfo snapshot to the in-process authorization
 * watermark. RevenueCat remains the only persisted cache and entitlement source.
 *
 * Clock rollback detection and ordering watermarks are necessarily process-local:
 * after a full process/device restart we can only validate the SDK's cached
 * requestDate against the current wall clock. We intentionally persist no
 * parallel receipt or premium flag.
 */
export function evaluateHighRollerAccess(
  previous: HighRollerAccessState,
  snapshot: HighRollerCustomerSnapshot | undefined,
  nowMs: number,
  productionNativeRuntime: boolean,
): HighRollerAccessDecision {
  if (!Number.isFinite(nowMs)) {
    return { state: { ...previous, authorizationDeadlineMs: 0 }, authorized: false, reason: 'invalid-request' };
  }

  if (
    previous.clockRollbackDetected
    || (previous.lastObservedNowMs > 0 && nowMs < previous.lastObservedNowMs)
  ) {
    return {
      state: {
        ...previous,
        authorizationDeadlineMs: 0,
        lastObservedNowMs: Math.max(previous.lastObservedNowMs, nowMs),
        clockRollbackDetected: true,
      },
      authorized: false,
      reason: 'clock-rollback',
    };
  }

  const observedState = { ...previous, lastObservedNowMs: nowMs };
  if (!productionNativeRuntime) {
    return {
      state: { ...observedState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'invalid-runtime',
    };
  }
  if (!snapshot) return currentDecision(observedState, nowMs, 'expired');

  const requestMs = Date.parse(snapshot.requestDate);
  if (!Number.isFinite(requestMs)) {
    return {
      state: { ...observedState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'invalid-request',
    };
  }
  if (requestMs > nowMs) {
    return {
      state: { ...observedState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'future-request',
    };
  }
  if (!isVerified(snapshot.entitlementsVerification)) {
    return {
      state: { ...observedState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'unverified',
    };
  }
  if (requestMs < previous.latestRequestMs) {
    return currentDecision(observedState, nowMs, 'out-of-order');
  }
  if (requestMs === previous.latestRequestMs && previous.latestRequestMs !== 0) {
    return currentDecision(observedState, nowMs, 'expired');
  }

  const newestState = { ...observedState, latestRequestMs: requestMs };
  const entitlement = snapshot.entitlement;
  if (!entitlement || entitlement.identifier !== 'com_howtoplayblackjack_app_High_Roller') {
    return {
      state: { ...newestState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'wrong-entitlement',
    };
  }
  if (!isVerified(entitlement.verification)) {
    return {
      state: { ...newestState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'unverified',
    };
  }
  if (!entitlement.isActive) {
    return {
      state: { ...newestState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'inactive',
    };
  }
  if (entitlement.isSandbox || entitlement.store === 'TEST_STORE') {
    return {
      state: { ...newestState, authorizationDeadlineMs: 0 },
      authorized: false,
      reason: 'sandbox',
    };
  }

  let deadlineMs = requestMs + HIGH_ROLLER_OFFLINE_WINDOW_MS;
  if (entitlement.expirationDate !== null) {
    const expirationMs = Date.parse(entitlement.expirationDate);
    if (!Number.isFinite(expirationMs)) {
      return {
        state: { ...newestState, authorizationDeadlineMs: 0 },
        authorized: false,
        reason: 'invalid-expiration',
      };
    }
    deadlineMs = Math.min(deadlineMs, expirationMs);
  }

  const state = {
    ...newestState,
    authorizationDeadlineMs: deadlineMs,
    expirationWatermarkMs: Math.max(previous.expirationWatermarkMs, deadlineMs),
  };
  return {
    state,
    authorized: deadlineMs > nowMs,
    reason: deadlineMs > nowMs ? 'active' : 'expired',
  };
}

export function observeHighRollerClock(
  previous: HighRollerAccessState,
  nowMs: number,
): HighRollerAccessDecision {
  return evaluateHighRollerAccess(previous, undefined, nowMs, true);
}