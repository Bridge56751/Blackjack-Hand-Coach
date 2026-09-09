import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { LinearGradient } from 'expo-linear-gradient';

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
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={close}>
      <View style={styles.container}>
        <LinearGradient 
          colors={['#04120B', '#092317', '#06160E']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={StyleSheet.absoluteFill} 
        />
        
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable 
            testID="high-roller-close" 
            accessibilityLabel="Close High Roller" 
            onPress={close} 
            style={({pressed}) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === 'web' ? Math.max(insets.bottom, 34) : Math.max(insets.bottom, 18) },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.hero}>
            <View style={styles.emblemOuter}>
              <LinearGradient colors={['#E6B836', '#B38210']} style={styles.emblemInner}>
                <MaterialCommunityIcons name="crown" size={26} color="#151006" />
              </LinearGradient>
            </View>
            <Text style={styles.eyebrow}>BLACKJACK COACH MEMBERSHIP</Text>
            <Text style={styles.title}>HIGH ROLLER</Text>
            <Text style={styles.subtitle}>
              Train beyond the book. Read the table, master the count, and review every costly decision.
            </Text>
          </View>

          <View style={styles.benefitsContainer}>
            {benefits.map(benefit => (
              <View key={benefit} style={styles.benefitRow}>
                <Feather name="check-circle" size={16} color="#D4AF37" style={styles.benefitIcon} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionArea}>
            {pendingPackage ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmEyebrow}>CONFIRM YOUR SEAT</Text>
                <Text style={styles.confirmTitle}>{pendingPackage.product.title}</Text>
                <Text style={styles.confirmPrice}>{pendingPackage.product.priceString}</Text>
                <Text style={styles.confirmCopy}>Your store account will be charged. Subscription renews automatically until cancelled.</Text>
                <Pressable
                  testID="high-roller-confirm-purchase"
                  disabled={busy}
                  onPress={() => void onPurchase(pendingPackage)}
                  style={({pressed}) => [styles.confirmButton, (pressed || busy) && styles.confirmButtonActive]}
                >
                  {isPurchasing ? <ActivityIndicator color="#111006" /> : <Text style={styles.confirmButtonText}>CONFIRM PURCHASE</Text>}
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
                      style={({pressed}) => [
                        styles.planCard, 
                        annual && styles.planCardFeatured, 
                        pressed && styles.planCardPressed
                      ]}
                    >
                      <View style={styles.planHeaderRow}>
                        <Text style={styles.planTitle}>{annual ? 'YEARLY' : 'MONTHLY'}</Text>
                        {annual && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>BEST VALUE</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.planPriceRow}>
                        <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                        <Text style={styles.planDuration}>{annual ? '/year' : '/mo'}</Text>
                      </View>
                      <Text style={styles.planDescription}>{annual ? 'One year of full table access' : 'Flexible month-to-month access'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.unavailable}>
                <Feather name="wifi-off" size={24} color="#D4AF37" style={{ marginBottom: 12 }} />
                <Text style={styles.unavailableTitle}>Plans unavailable</Text>
                <Text style={styles.unavailableText}>Check your connection and try again shortly.</Text>
              </View>
            )}

            {!!error && <Text testID="high-roller-error" style={styles.error}>{error}</Text>}
            {!!source && <Text style={styles.source}>Unlock requested from {source}</Text>}
          </View>

          <View style={styles.footer}>
            <Pressable
              testID="high-roller-restore"
              disabled={busy}
              onPress={() => void onRestore()}
              style={({pressed}) => [styles.restoreBtn, pressed && { opacity: 0.6 }]}
            >
              {isRestoring ? <ActivityIndicator size="small" color="#D4AF37" /> : <Text style={styles.restoreText}>RESTORE PURCHASES</Text>}
            </Pressable>
            <Text style={styles.legal}>Cancel anytime in your App Store or Google Play subscription settings.</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#04120B' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    paddingHorizontal: 20, 
    paddingBottom: 4
  },
  closeBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.06)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  scrollContent: { 
    paddingHorizontal: 24, 
    flexGrow: 1 
  },
  hero: { 
    alignItems: 'center', 
    marginTop: 4
  },
  emblemOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emblemInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  eyebrow: { 
    color: '#D4AF37', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 10, 
    letterSpacing: 1.8, 
    marginBottom: 6 
  },
  title: { 
    color: '#FFFFFF', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 30, 
    letterSpacing: 1.5, 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  subtitle: { 
    color: 'rgba(255,255,255,0.7)', 
    fontFamily: 'Inter_400Regular', 
    fontSize: 14, 
    lineHeight: 20, 
    textAlign: 'center', 
    paddingHorizontal: 16 
  },
  benefitsContainer: { 
    marginTop: 28, 
    gap: 16, 
    paddingHorizontal: 8 
  },
  benefitRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 14 
  },
  benefitIcon: { 
    marginTop: 1 
  },
  benefitText: { 
    color: '#FFFFFF', 
    fontFamily: 'Inter_500Medium', 
    fontSize: 14, 
    lineHeight: 20, 
    flex: 1, 
    opacity: 0.85 
  },
  actionArea: { 
    marginTop: 24, 
    width: '100%' 
  },
  planList: { 
    gap: 16 
  },
  planCard: { 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    backgroundColor: 'rgba(0,0,0,0.25)', 
    padding: 20, 
  },
  planCardFeatured: {
    borderColor: 'rgba(212,175,55,0.4)',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  planCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }]
  },
  planHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  planTitle: { 
    color: '#FFFFFF', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 14, 
    letterSpacing: 1 
  },
  badge: { 
    backgroundColor: '#D4AF37', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  badgeText: { 
    color: '#111006', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 10, 
    letterSpacing: 0.5 
  },
  planPriceRow: { 
    flexDirection: 'row', 
    alignItems: 'baseline', 
    gap: 4, 
    marginBottom: 6 
  },
  planPrice: { 
    color: '#D4AF37', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 26 
  },
  planDuration: { 
    color: 'rgba(255,255,255,0.5)', 
    fontFamily: 'Inter_500Medium', 
    fontSize: 14 
  },
  planDescription: { 
    color: 'rgba(255,255,255,0.6)', 
    fontFamily: 'Inter_400Regular', 
    fontSize: 13 
  },
  confirmBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
    alignItems: 'center',
  },
  confirmEyebrow: { 
    color: '#D4AF37', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 11, 
    letterSpacing: 1.5, 
    marginBottom: 12 
  },
  confirmTitle: { 
    color: '#FFFFFF', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 22, 
    marginBottom: 6 
  },
  confirmPrice: { 
    color: '#D4AF37', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 32, 
    marginBottom: 16 
  },
  confirmCopy: { 
    color: 'rgba(255,255,255,0.6)', 
    fontFamily: 'Inter_400Regular', 
    fontSize: 12, 
    lineHeight: 18, 
    textAlign: 'center', 
    marginBottom: 24 
  },
  confirmButton: { 
    width: '100%', 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#D4AF37', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmButtonActive: { 
    opacity: 0.8 
  },
  confirmButtonText: { 
    color: '#111006', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 14, 
    letterSpacing: 1 
  },
  cancelButton: { 
    paddingVertical: 10, 
    paddingHorizontal: 16 
  },
  cancelText: { 
    color: 'rgba(255,255,255,0.6)', 
    fontFamily: 'Inter_500Medium', 
    fontSize: 13 
  },
  unavailable: { 
    alignItems: 'center', 
    padding: 24, 
    borderRadius: 18, 
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  unavailableTitle: { 
    color: '#FFFFFF', 
    fontFamily: 'Inter_700Bold', 
    fontSize: 16, 
    marginBottom: 6 
  },
  unavailableText: { 
    color: 'rgba(255,255,255,0.5)', 
    fontFamily: 'Inter_400Regular', 
    fontSize: 13, 
    textAlign: 'center'
  },
  error: { 
    color: '#FF8C8C', 
    fontFamily: 'Inter_500Medium', 
    fontSize: 12, 
    lineHeight: 18, 
    textAlign: 'center', 
    marginTop: 20 
  },
  source: { 
    color: 'rgba(255,255,255,0.3)', 
    fontFamily: 'Inter_400Regular', 
    fontSize: 10, 
    textAlign: 'center', 
    marginTop: 16 
  },
  footer: { 
    alignItems: 'center', 
    paddingTop: 16, 
    paddingHorizontal: 24
  },
  restoreBtn: { 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    marginBottom: 12 
  },
  restoreText: { 
    color: '#D4AF37', 
    fontFamily: 'Inter_600SemiBold', 
    fontSize: 12, 
    letterSpacing: 1 
  },
  legal: { 
    color: 'rgba(255,255,255,0.35)', 
    fontFamily: 'Inter_400Regular', 
    fontSize: 10, 
    lineHeight: 14,
    textAlign: 'center', 
    paddingBottom: 0
  },
});
