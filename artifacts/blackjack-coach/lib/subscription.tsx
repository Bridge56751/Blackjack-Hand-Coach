import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HighRollerPaywall } from '@/components/HighRollerPaywall';
import {
  EMPTY_HIGH_ROLLER_ACCESS_STATE,
  evaluateHighRollerAccess,
  HighRollerAccessDecision,
  HighRollerAccessState,
  HighRollerCustomerSnapshot,
  observeHighRollerClock,
} from '@/lib/high-roller-access-policy';

export const HIGH_ROLLER_ENTITLEMENT = 'com_howtoplayblackjack_app_High_Roller';
const CUSTOMER_INFO_REFRESH_INTERVAL_MS = 5 * 60_000;

const testApiKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

let configured = false;
let configurationError: string | null = null;

function apiKeyForRuntime() {
  if (__DEV__) return testApiKey;
  if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') return undefined;
  return Platform.OS === 'ios' ? iosApiKey : androidApiKey;
}

function expectedApiKeyPrefix() {
  if (__DEV__) return 'test_';
  return Platform.OS === 'ios' ? 'appl_' : 'goog_';
}

export function initializeRevenueCat() {
  if (configured || configurationError) return;
  if (!__DEV__ && (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient')) {
    configurationError = 'High Roller purchases are available only in the signed App Store or Google Play app.';
    return;
  }
  const apiKey = apiKeyForRuntime();
  if (!apiKey) {
    configurationError = 'High Roller purchases are not configured yet.';
    return;
  }
  if (!apiKey.startsWith(expectedApiKeyPrefix())) {
    configurationError = 'High Roller purchases are configured for the wrong store environment.';
    return;
  }
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({
      apiKey,
      entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
    });
    configured = true;
  } catch (error) {
    configurationError = error instanceof Error ? error.message : 'RevenueCat could not start.';
  }
}

type SubscriptionContextValue = {
  isHighRoller: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  offering?: PurchasesOffering;
  error: string | null;
  openPaywall: (source?: string) => void;
  closePaywall: () => void;
  purchase: (pkg: PurchasesPackage) => Promise<CustomerInfo>;
  restore: () => Promise<CustomerInfo>;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallSource, setPaywallSource] = useState<string>();
  const [actionError, setActionError] = useState<string | null>(null);
  const productionNativeRuntime = !__DEV__
    && Platform.OS !== 'web'
    && Constants.executionEnvironment !== 'storeClient';
  const policyStateRef = useRef<HighRollerAccessState>(EMPTY_HIGH_ROLLER_ACCESS_STATE);
  const [policyDecision, setPolicyDecision] = useState<HighRollerAccessDecision>(() => ({
    state: EMPTY_HIGH_ROLLER_ACCESS_STATE,
    authorized: false,
    reason: productionNativeRuntime ? 'expired' : 'invalid-runtime',
  }));

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    const entitlement = info.entitlements.active[HIGH_ROLLER_ENTITLEMENT];
    const snapshot: HighRollerCustomerSnapshot = {
      requestDate: info.requestDate,
      entitlementsVerification: info.entitlements.verification,
      entitlement: entitlement ? {
        identifier: entitlement.identifier,
        isActive: entitlement.isActive,
        verification: entitlement.verification,
        expirationDate: entitlement.expirationDate,
        isSandbox: entitlement.isSandbox,
        store: entitlement.store,
      } : undefined,
    };
    const decision = evaluateHighRollerAccess(
      policyStateRef.current,
      snapshot,
      Date.now(),
      productionNativeRuntime,
    );
    policyStateRef.current = decision.state;
    setPolicyDecision(decision);
    return decision;
  }, [productionNativeRuntime]);

  const fetchCustomerInfo = useCallback(async () => {
    // getCustomerInfo() is deliberately called without invalidating first. The
    // RN SDK has no cache-policy argument in 10.9.0, and its persisted,
    // signature-verified CustomerInfo may be the only cold-start offline copy.
    const info = await Purchases.getCustomerInfo();
    applyCustomerInfo(info);
    return info;
  }, [applyCustomerInfo]);

  const customerQuery = useQuery({
    queryKey: ['revenuecat', 'customer'],
    queryFn: fetchCustomerInfo,
    enabled: configured,
    staleTime: 60_000,
    refetchInterval: CUSTOMER_INFO_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: () => Purchases.getOfferings(),
    enabled: configured,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!policyDecision.authorized) return;
    const remainingMs = policyDecision.state.authorizationDeadlineMs - Date.now();
    const timer = setTimeout(() => {
      const decision = observeHighRollerClock(policyStateRef.current, Date.now());
      policyStateRef.current = decision.state;
      setPolicyDecision(decision);
    }, Math.max(0, remainingMs) + 50);
    return () => clearTimeout(timer);
  }, [policyDecision]);

  useEffect(() => {
    if (!configured) return;
    const listener = (info: CustomerInfo) => {
      applyCustomerInfo(info);
      queryClient.setQueryData(['revenuecat', 'customer'], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [applyCustomerInfo, queryClient]);

  useEffect(() => {
    if (!configured) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const decision = observeHighRollerClock(policyStateRef.current, Date.now());
        policyStateRef.current = decision.state;
        setPolicyDecision(decision);
        void queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer'] });
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      setActionError(null);
      const result = await Purchases.purchasePackage(pkg);
      const decision = applyCustomerInfo(result.customerInfo);
      queryClient.setQueryData(['revenuecat', 'customer'], result.customerInfo);
      if (!decision.authorized) {
        throw new Error('Purchase completed, but High Roller access was not activated. Restore purchases or contact support.');
      }
      return result.customerInfo;
    },
    onSuccess: info => {
      queryClient.setQueryData(['revenuecat', 'customer'], info);
      setPaywallVisible(false);
    },
    onError: error => {
      const cancelled = typeof error === 'object' && error !== null && 'userCancelled' in error && error.userCancelled;
      if (!cancelled) setActionError(error instanceof Error ? error.message : 'Purchase could not be completed.');
    },
  });
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const info = await Purchases.restorePurchases();
      const decision = applyCustomerInfo(info);
      if (!decision.authorized) {
        throw new Error('No verified active High Roller purchase was found.');
      }
      return info;
    },
    onSuccess: info => {
      queryClient.setQueryData(['revenuecat', 'customer'], info);
      setPaywallVisible(false);
    },
    onError: error => setActionError(error instanceof Error ? error.message : 'Purchases could not be restored.'),
  });

  const value = useMemo<SubscriptionContextValue>(() => ({
    isHighRoller: policyDecision.authorized,
    isLoading: configured && (customerQuery.isLoading || offeringsQuery.isLoading),
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    offering: offeringsQuery.data?.current ?? undefined,
    error: actionError
      ?? configurationError
      ?? (customerQuery.error instanceof Error
        && policyDecision.reason === 'expired'
        && policyDecision.state.authorizationDeadlineMs > 0
        ? 'The 36-hour offline access window expired. Reconnect to verify High Roller.'
        : customerQuery.error instanceof Error ? customerQuery.error.message : null)
      ?? (offeringsQuery.error instanceof Error ? offeringsQuery.error.message : null),
    openPaywall: (source?: string) => {
      setActionError(null);
      setPaywallSource(source);
      setPaywallVisible(true);
    },
    closePaywall: () => setPaywallVisible(false),
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    refresh: async () => {
      await Promise.all([customerQuery.refetch(), offeringsQuery.refetch()]);
    },
  }), [
    actionError,
    customerQuery.data,
    customerQuery.error,
    customerQuery.isLoading,
    offeringsQuery.data,
    offeringsQuery.error,
    offeringsQuery.isLoading,
    policyDecision,
    purchaseMutation.isPending,
    restoreMutation.isPending,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <HighRollerPaywall
        visible={paywallVisible}
        source={paywallSource}
        offering={value.offering}
        error={value.error}
        isPurchasing={value.isPurchasing}
        isRestoring={value.isRestoring}
        onClose={value.closePaywall}
        onPurchase={value.purchase}
        onRestore={value.restore}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return value;
}