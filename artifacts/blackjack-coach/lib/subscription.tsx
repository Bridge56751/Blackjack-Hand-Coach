import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

function hasHighRollerEntitlement(info: CustomerInfo | undefined): boolean {
  return Boolean(info?.entitlements.active[HIGH_ROLLER_ENTITLEMENT]);
}

const testApiKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

let configured = false;
let configurationError: string | null = null;

function apiKeyForRuntime() {
  if (__DEV__ || Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') {
    return testApiKey;
  }
  return Platform.OS === 'ios' ? iosApiKey : androidApiKey;
}

export function initializeRevenueCat() {
  if (configured || configurationError) return;
  const apiKey = apiKeyForRuntime();
  if (!apiKey) {
    configurationError = 'High Roller purchases are not configured yet.';
    return;
  }
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
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

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const customerQuery = useQuery({
    queryKey: ['revenuecat', 'customer'],
    queryFn: () => Purchases.getCustomerInfo(),
    enabled: configured,
    staleTime: 60_000,
  });
  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: () => Purchases.getOfferings(),
    enabled: configured,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!configured) return;
    const listener = (info: CustomerInfo) => {
      queryClient.setQueryData(['revenuecat', 'customer'], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!configured) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer'] });
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      setActionError(null);
      const result = await Purchases.purchasePackage(pkg);
      queryClient.setQueryData(['revenuecat', 'customer'], result.customerInfo);
      if (!hasHighRollerEntitlement(result.customerInfo)) {
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
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: info => {
      queryClient.setQueryData(['revenuecat', 'customer'], info);
      if (hasHighRollerEntitlement(info)) setPaywallVisible(false);
      else setActionError('No active High Roller purchase was found.');
    },
    onError: error => setActionError(error instanceof Error ? error.message : 'Purchases could not be restored.'),
  });

  const value = useMemo<SubscriptionContextValue>(() => ({
    isHighRoller: hasHighRollerEntitlement(customerQuery.data),
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