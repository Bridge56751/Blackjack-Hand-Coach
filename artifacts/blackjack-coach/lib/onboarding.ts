import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_STORAGE_KEY = 'blackjack_coach:onboarding:v1';
export const ONBOARDING_VERSION = 1;

export type OnboardingGoal =
  | 'learn-blackjack'
  | 'play-blackjack'
  | 'practice-with-coach'
  | 'learn-card-counting';

export type OnboardingRecord = {
  version: typeof ONBOARDING_VERSION;
  goal: OnboardingGoal;
  completedAt: string;
};

export async function getOnboardingRecord(): Promise<OnboardingRecord | null> {
  try {
    const rawRecord = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!rawRecord) return null;

    const record: unknown = JSON.parse(rawRecord);
    if (
      typeof record === 'object' &&
      record !== null &&
      (record as OnboardingRecord).version === ONBOARDING_VERSION &&
      typeof (record as OnboardingRecord).goal === 'string'
    ) {
      return record as OnboardingRecord;
    }
  } catch {
    // A malformed local preference should gracefully reopen the welcome table.
  }
  return null;
}

export async function saveOnboardingGoal(goal: OnboardingGoal): Promise<void> {
  const record: OnboardingRecord = {
    version: ONBOARDING_VERSION,
    goal,
    completedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(record));
}