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

export const HIGH_ROLLER_ENTITLEMENT = 'com_howtoplayblackjack_app_High_Roller';
const CUSTOMER_INFO_MAX_AGE_MS = 10 * 60_000;
const CUSTOMER_INFO_REFRESH_INTERVAL_MS = 5 * 60_000;

function hasHighRollerEntitlement(
  info: CustomerInfo | undefined,
  expiredThroughRequestDate = 0,
): boolean {
  if (!info) return false;
  const requestedAt = Date.parse(info.requestDate);
  if (!Number.isFinite(requestedAt) || requestedAt <= expiredThroughRequestDate) return false;
  const entitlement = info.entitlements.active[HIGH_ROLLER_ENTITLEMENT];
  if (!entitlement?.isActive) return false;
  if (entitlement.verification === Purchases.VERIFICATION_RESULT.FAILED) return false;

  if (!__DEV__) {
    const verified = entitlement.verification === Purchases.VERIFICATION_RESULT.VERIFIED
      || entitlement.verification === Purchases.VERIFICATION_RESULT.VERIFIED_ON_DEVICE;
    if (!verified) return false;

    const age = Date.now() - requestedAt;
    if (age < -60_000 || age > CUSTOMER_INFO_MAX_AGE_MS) return false;
  }

  return true;
}

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
  const [expiredThroughRequestDate, setExpiredThroughRequestDate] = useState(0);
  const [hasAuthoritativeCustomerInfo, setHasAuthoritativeCustomerInfo] = useState(__DEV__);
  const newestRequestDateRef = useRef(0);

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const acceptCustomerInfo = useCallback((info: CustomerInfo) => {
    const requestedAt = Date.parse(info.requestDate);
    if (!Number.isFinite(requestedAt)) return false;
    if (!__DEV__ && requestedAt < newestRequestDateRef.current) return false;
    newestRequestDateRef.current = Math.max(newestRequestDateRef.current, requestedAt);
    return true;
  }, []);

  const fetchAuthoritativeCustomerInfo = useCallback(async () => {
    if (!__DEV__) await Purchases.invalidateCustomerInfoCache();
    const info = await Purchases.getCustomerInfo();
    if (!acceptCustomerInfo(info)) {
      throw new Error('RevenueCat returned an out-of-order customer record.');
    }
    setHasAuthoritativeCustomerInfo(true);
    return info;
  }, [acceptCustomerInfo]);

  const customerQuery = useQuery({
    queryKey: ['revenuecat', 'customer'],
    queryFn: fetchAuthoritativeCustomerInfo,
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
    if (__DEV__ || !customerQuery.data) return;

    const requestDate = customerQuery.data.requestDate;
    const requestedAt = Date.parse(requestDate);
    if (requestedAt <= expiredThroughRequestDate) return;
    const age = Date.now() - requestedAt;
    if (!Number.isFinite(requestedAt) || age < -60_000 || age >= CUSTOMER_INFO_MAX_AGE_MS) {
      if (Number.isFinite(requestedAt)) {
        setExpiredThroughRequestDate(previous => Math.max(previous, requestedAt));
      }
      return;
    }

    const timer = setTimeout(
      () => setExpiredThroughRequestDate(previous => Math.max(previous, requestedAt)),
      CUSTOMER_INFO_MAX_AGE_MS - age + 50,
    );
    return () => clearTimeout(timer);
  }, [customerQuery.data, expiredThroughRequestDate]);

  useEffect(() => {
    if (!configured) return;
    const listener = (info: CustomerInfo) => {
      if (acceptCustomerInfo(info)) {
        queryClient.setQueryData(['revenuecat', 'customer'], info);
      }
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [acceptCustomerInfo, queryClient]);

  useEffect(() => {
    if (!configured) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const current = queryClient.getQueryData<CustomerInfo>(['revenuecat', 'customer']);
        if (!__DEV__) setHasAuthoritativeCustomerInfo(false);
        if (current) {
          const requestedAt = Date.parse(current.requestDate);
          if (Number.isFinite(requestedAt)) {
            setExpiredThroughRequestDate(previous => Math.max(previous, requestedAt));
          }
        }
        void Purchases.invalidateCustomerInfoCache()
          .catch(() => undefined)
          .then(() => queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer'] }));
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      setActionError(null);
      const result = await Purchases.purchasePackage(pkg);
      if (!acceptCustomerInfo(result.customerInfo)) {
        throw new Error('The purchase status could not be verified. Restore purchases and try again.');
      }
      setHasAuthoritativeCustomerInfo(true);
      queryClient.setQueryData(['revenuecat', 'customer'], result.customerInfo);
      if (!hasHighRollerEntitlement(result.customerInfo, expiredThroughRequestDate)) {
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
      if (!acceptCustomerInfo(info)) {
        throw new Error('The restored purchase status could not be verified. Try again.');
      }
      setHasAuthoritativeCustomerInfo(true);
      return info;
    },
    onSuccess: info => {
      queryClient.setQueryData(['revenuecat', 'customer'], info);
      if (hasHighRollerEntitlement(info, expiredThroughRequestDate)) setPaywallVisible(false);
      else setActionError('No active High Roller purchase was found.');
    },
    onError: error => setActionError(error instanceof Error ? error.message : 'Purchases could not be restored.'),
  });

  const value = useMemo<SubscriptionContextValue>(() => ({
    isHighRoller: hasAuthoritativeCustomerInfo
      && hasHighRollerEntitlement(customerQuery.data, expiredThroughRequestDate),
    isLoading: configured && (customerQuery.isLoading || offeringsQuery.isLoading),
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    offering: offeringsQuery.data?.current ?? undefined,
    error: actionError
      ?? configurationError
      ?? (customerQuery.error instanceof Error ? customerQuery.error.message : null)
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
      await Purchases.invalidateCustomerInfoCache();
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
    expiredThroughRequestDate,
    hasAuthoritativeCustomerInfo,
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