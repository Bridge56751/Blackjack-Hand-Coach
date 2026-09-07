import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

type Props = {
  visible: boolean;
  source?: string;
  offering?: PurchasesOffering;
  error: string | null;
  isPurchasing: boolean;
  isRestoring: boolean;
  onClose: () => void;
  onPurchase: (pkg: PurchasesPackage) => Promise<unknown>;
  onRestore: () => Promise<unknown>;
};

const benefits = [
  'Live running count, true count, and estimated edge',
  'Hi-Lo index hints and count-adjusted grading',
  'Every mistake explained hand by hand',
  'Add practice bankroll during a session',
];

export function HighRollerPaywall({
  visible,
  source,
  offering,
  error,
  isPurchasing,
  isRestoring,
  onClose,
  onPurchase,
  onRestore,
}: Props) {
  const insets = useSafeAreaInsets();
  const packages = offering?.availablePackages ?? [];
  const yearly = packages.find(item => item.packageType === 'ANNUAL');
  const monthly = packages.find(item => item.packageType === 'MONTHLY');
  const ordered = useMemo(() => [yearly, monthly].filter(Boolean) as PurchasesPackage[], [yearly, monthly]);
  const [pendingPackage, setPendingPackage] = useState<PurchasesPackage | null>(null);
  const busy = isPurchasing || isRestoring;

  const close = () => {
    if (busy) return;
    setPendingPackage(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Pressable testID="high-roller-close" accessibilityLabel="Close High Roller" onPress={close} style={styles.close}>
              <Feather name="x" size={20} color="rgba(255,255,255,0.72)" />
            </Pressable>
            <View style={styles.emblem}>
              <MaterialCommunityIcons name="crown" size={32} color="#151006" />
            </View>
            <Text style={styles.eyebrow}>BLACKJACK COACH MEMBERSHIP</Text>
            <Text style={styles.title}>HIGH ROLLER</Text>
            <Text style={styles.subtitle}>
              Train beyond the book. Read the table, master the count, and review every costly decision.
            </Text>

            <View style={styles.benefits}>
              {benefits.map(benefit => (
                <View key={benefit} style={styles.benefitRow}>
                  <View style={styles.check}><Feather name="check" size={12} color="#0A2B1B" /></View>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {pendingPackage ? (
              <View style={styles.confirmCard}>
                <Text style={styles.confirmEyebrow}>CONFIRM YOUR SEAT</Text>
                <Text style={styles.confirmTitle}>{pendingPackage.product.title}</Text>
                <Text style={styles.confirmPrice}>{pendingPackage.product.priceString}</Text>
                <Text style={styles.confirmCopy}>Your store account will be charged. Subscription renews automatically until cancelled.</Text>
                <Pressable
                  testID="high-roller-confirm-purchase"
                  disabled={busy}
                  onPress={() => void onPurchase(pendingPackage)}
                  style={[styles.primaryButton, busy && styles.disabled]}
                >
                  {isPurchasing ? <ActivityIndicator color="#111006" /> : <Text style={styles.primaryText}>CONFIRM PURCHASE</Text>}
                </Pressable>
                <Pressable disabled={busy} onPress={() => setPendingPackage(null)} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Choose another plan</Text>
                </Pressable>
              </View>
            ) : ordered.length > 0 ? (
              <View style={styles.planList}>
                {ordered.map(pkg => {
                  const annual = pkg.packageType === 'ANNUAL';
                  return (
                    <Pressable
                      key={pkg.identifier}
                      testID={annual ? 'high-roller-yearly' : 'high-roller-monthly'}
                      onPress={() => setPendingPackage(pkg)}
                      style={[styles.plan, annual && styles.planFeatured]}
                    >
                      <View style={styles.planCopy}>
                        <View style={styles.planTitleRow}>
                          <Text style={styles.planTitle}>{annual ? 'YEARLY' : 'MONTHLY'}</Text>
                          {annual && <Text style={styles.bestValue}>BEST VALUE</Text>}
                        </View>
                        <Text style={styles.planDetail}>{annual ? 'One year of full table access' : 'Flexible month-to-month access'}</Text>
                      </View>
                      <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.unavailable}>
                <Feather name="wifi-off" size={20} color="#D4AF37" />
                <Text style={styles.unavailableTitle}>Plans unavailable</Text>
                <Text style={styles.unavailableText}>Check your connection and try again shortly.</Text>
              </View>
            )}

            {!!error && <Text testID="high-roller-error" style={styles.error}>{error}</Text>}
            {!!source && <Text style={styles.source}>Unlock requested from {source}</Text>}
            <Pressable
              testID="high-roller-restore"
              disabled={busy}
              onPress={() => void onRestore()}
              style={styles.restore}
            >
              {isRestoring ? <ActivityIndicator size="small" color="#D4AF37" /> : <Text style={styles.restoreText}>RESTORE PURCHASES</Text>}
            </Pressable>
            <Text style={styles.legal}>Cancel anytime in your App Store or Google Play subscription settings.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.76)' },
  sheet: { maxHeight: '94%', marginHorizontal: 8, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(212,175,55,0.38)', backgroundColor: '#082718' },
  content: { paddingHorizontal: 22, paddingTop: 20 },
  close: { alignSelf: 'flex-end', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  emblem: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4AF37', borderWidth: 5, borderColor: 'rgba(212,175,55,0.18)', marginTop: -6 },
  eyebrow: { marginTop: 14, textAlign: 'center', color: '#D4AF37', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.6 },
  title: { marginTop: 5, textAlign: 'center', color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: 2.2 },
  subtitle: { alignSelf: 'center', maxWidth: 340, marginTop: 8, textAlign: 'center', color: 'rgba(255,255,255,0.68)', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  benefits: { marginTop: 20, gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center' },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4AF37', marginRight: 10 },
  benefitText: { flex: 1, color: 'rgba(255,255,255,0.88)', fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  planList: { marginTop: 20, gap: 10 },
  plan: { minHeight: 74, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 15, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  planFeatured: { borderColor: 'rgba(212,175,55,0.72)', backgroundColor: 'rgba(212,175,55,0.1)' },
  planCopy: { flex: 1, paddingRight: 10 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1 },
  bestValue: { color: '#151006', backgroundColor: '#D4AF37', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.7 },
  planDetail: { marginTop: 4, color: 'rgba(255,255,255,0.52)', fontFamily: 'Inter_400Regular', fontSize: 11 },
  planPrice: { color: '#D4AF37', fontFamily: 'Inter_700Bold', fontSize: 18 },
  confirmCard: { marginTop: 20, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(212,175,55,0.55)', backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center' },
  confirmEyebrow: { color: '#D4AF37', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  confirmTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 7 },
  confirmPrice: { color: '#D4AF37', fontFamily: 'Inter_700Bold', fontSize: 28, marginTop: 3 },
  confirmCopy: { color: 'rgba(255,255,255,0.58)', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginVertical: 12 },
  primaryButton: { width: '100%', minHeight: 48, borderRadius: 24, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#111006', fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1 },
  disabled: { opacity: 0.55 },
  cancelButton: { paddingTop: 13, paddingHorizontal: 16 },
  cancelText: { color: 'rgba(255,255,255,0.62)', fontFamily: 'Inter_500Medium', fontSize: 12 },
  unavailable: { marginTop: 20, alignItems: 'center', padding: 18, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.2)' },
  unavailableTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 8 },
  unavailableText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  error: { color: '#FF8C8C', fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 12 },
  source: { color: 'rgba(255,255,255,0.32)', fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center', marginTop: 8 },
  restore: { alignSelf: 'center', minHeight: 42, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  restoreText: { color: '#D4AF37', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
  legal: { color: 'rgba(255,255,255,0.36)', fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 13, textAlign: 'center', paddingHorizontal: 12, paddingBottom: Platform.OS === 'web' ? 18 : 2 },
});