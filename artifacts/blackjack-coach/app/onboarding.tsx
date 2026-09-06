import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { OnboardingGoal, saveOnboardingGoal } from '@/lib/onboarding';

const palette = colors.light;

type GoalOption = {
  id: OnboardingGoal;
  title: string;
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const GOALS: GoalOption[] = [
  { id: 'learn-blackjack', title: 'Learn Blackjack', detail: 'Build a confident foundation at your own pace.', icon: 'cards-outline' },
  { id: 'play-blackjack', title: 'Play Blackjack', detail: 'Take a seat and sharpen your decisions hand by hand.', icon: 'cards-playing-outline' },
  { id: 'practice-with-coach', title: 'Practice with a Coach', detail: 'Use the table to review your choices after each session.', icon: 'account-tie-outline' },
  { id: 'learn-card-counting', title: 'Learn Card Counting', detail: 'Make this your starting point when counting arrives at the table.', icon: 'counter' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [selectedGoal, setSelectedGoal] = useState<OnboardingGoal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isCompact = height <= 740;

  const selectGoal = (goal: OnboardingGoal) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedGoal(goal);
  };

  const continueToDashboard = async () => {
    if (!selectedGoal || isSaving) return;
    setIsSaving(true);
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await saveOnboardingGoal(selectedGoal);
      router.replace('/');
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <View testID="onboarding-screen" style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View pointerEvents="none" style={styles.ringLarge} />
      <View pointerEvents="none" style={styles.ringSmall} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          isCompact && styles.contentCompact,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 20),
            paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'web' ? 34 : 0),
          },
        ]}
        scrollEnabled
        bounces
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.brand, isCompact && styles.brandCompact]}>
          <View style={styles.brandRule} />
          <Text style={styles.brandName}>BLACKJACK</Text>
          <Text style={styles.brandSub}>COACH</Text>
          <View style={styles.brandRule} />
        </View>

        <View style={[styles.hero, isCompact && styles.heroCompact]}>
          <View style={styles.chip}>
            <MaterialCommunityIcons name="cards-playing-outline" size={18} color={palette.primary} />
            <Text style={styles.chipText}>YOUR SEAT IS READY</Text>
          </View>
          <Text style={styles.title}>How would you like to begin?</Text>
          <Text style={styles.intro}>Choose one focus for now. It will personalize your starting point as new experiences join the table.</Text>
        </View>

        <View style={[styles.goalList, isCompact && styles.goalListCompact]}>
          {GOALS.map((goal, index) => {
            const isSelected = selectedGoal === goal.id;
            return (
              <Pressable
                key={goal.id}
                testID={`onboarding-choice-${goal.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={goal.title}
                onPress={() => selectGoal(goal.id)}
                style={({ pressed }) => [styles.goalCard, isSelected && styles.goalCardSelected, pressed && styles.goalCardPressed]}
              >
                <View style={[styles.iconWell, isSelected && styles.iconWellSelected]}>
                  <MaterialCommunityIcons name={goal.icon} size={24} color={isSelected ? palette.primaryForeground : palette.primary} />
                </View>
                <View style={styles.goalCopy}>
                  <View style={styles.goalHeading}>
                    <Text style={[styles.goalTitle, isSelected && styles.goalTitleSelected]}>{goal.title}</Text>
                    <Text style={[styles.goalNumber, isSelected && styles.goalNumberSelected]}>0{index + 1}</Text>
                  </View>
                  <Text style={[styles.goalDetail, isSelected && styles.goalDetailSelected]}>{goal.detail}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          testID="onboarding-continue"
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedGoal || isSaving }}
          disabled={!selectedGoal || isSaving}
          onPress={continueToDashboard}
          style={({ pressed }) => [styles.continueButton, isCompact && styles.continueButtonCompact, (!selectedGoal || isSaving) && styles.continueDisabled, pressed && selectedGoal && styles.continuePressed]}
        >
          <Text style={styles.continueText}>{isSaving ? 'SETTING YOUR TABLE' : 'CONTINUE'}</Text>
          <Feather name="arrow-right" size={20} color={palette.primaryForeground} />
        </Pressable>
        <Text style={[styles.footnote, isCompact && styles.footnoteCompact]}>You can change direction when future experiences arrive.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  scrollView: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center' },
  contentCompact: { justifyContent: 'flex-start' },
  ringLarge: { position: 'absolute', width: 660, height: 660, borderRadius: 330, top: -290, left: -140, borderWidth: 2, borderColor: 'rgba(212,175,55,0.13)' },
  ringSmall: { position: 'absolute', width: 500, height: 500, borderRadius: 250, bottom: -310, right: -175, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 24 },
  brandCompact: { marginBottom: 14 },
  brandRule: { height: 1, width: 28, backgroundColor: 'rgba(212,175,55,0.55)' },
  brandName: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 2.4 },
  brandSub: { color: palette.primary, fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 2.7 },
  hero: { alignItems: 'center', marginBottom: 22 },
  heroCompact: { marginBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.36)', backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 11, paddingVertical: 7, marginBottom: 14 },
  chipText: { color: palette.primary, fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4 },
  title: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 34, letterSpacing: -0.5, textAlign: 'center', maxWidth: 330 },
  intro: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 9, maxWidth: 340 },
  goalList: { gap: 10 },
  goalListCompact: { gap: 7 },
  goalCard: { minHeight: 82, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', backgroundColor: 'rgba(0,0,0,0.22)', flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  goalCardSelected: { backgroundColor: '#F7F0DF', borderColor: palette.primary, shadowColor: '#000000', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5 },
  goalCardPressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  iconWell: { height: 46, width: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.12)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.22)' },
  iconWellSelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  goalCopy: { flex: 1 },
  goalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  goalTitle: { flex: 1, color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  goalTitleSelected: { color: '#183B29' },
  goalNumber: { color: 'rgba(255,255,255,0.34)', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.7 },
  goalNumberSelected: { color: 'rgba(24,59,41,0.4)' },
  goalDetail: { color: 'rgba(255,255,255,0.58)', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16, marginTop: 3 },
  goalDetailSelected: { color: 'rgba(24,59,41,0.7)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.48)', justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: '#183B29' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#183B29' },
  continueButton: { minHeight: 56, marginTop: 20, borderRadius: 28, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  continueButtonCompact: { marginTop: 14 },
  continueDisabled: { backgroundColor: 'rgba(212,175,55,0.35)', shadowOpacity: 0, elevation: 0 },
  continuePressed: { transform: [{ scale: 0.985 }] },
  continueText: { color: palette.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 1.4 },
  footnote: { color: 'rgba(255,255,255,0.46)', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 12, paddingHorizontal: 16 },
  footnoteCompact: { marginTop: 8 },
});