import { getItem, putItem } from "./db";
import { calculateAccountabilityDateKey } from "./accountability";
import { todayKey } from "./dateUtils";

const PROFILE_KEY = "user_profile";

export const PROFILE_UPDATED_EVENT = "profile-updated";

const DEFAULT_PROFILE = {
  key: PROFILE_KEY,
  gender: null,
  birthDate: null,
  accountabilityDate: null,
  regularPrayerStartDate: null,
  regularPrayerStartType: null,
  consistencyEstimate: null,
  menstruationDays: null,
  onboardingCompleted: false,
  language: "uz",
  notificationPreferences: {
    notificationsEnabled: false,
  },
  createdAt: null,
  updatedAt: null,
};

function notifyProfileUpdated(profile) {
  window.dispatchEvent(
    new CustomEvent(PROFILE_UPDATED_EVENT, {
      detail: profile,
    }),
  );
}

/**
 * Load the user profile from IndexedDB.
 */
export async function loadProfile() {
  const profile = await getItem("user_profile", PROFILE_KEY);

  if (!profile) return null;

  return {
    ...DEFAULT_PROFILE,
    ...profile,
  };
}

/**
 * Save the user profile to IndexedDB.
 *
 * If accountabilityDate is provided, keep it.
 * If it doesn't exist yet, calculate it automatically
 * from birthDate + gender.
 */
export async function saveProfile(profileData) {
  const existing = await getItem("user_profile", PROFILE_KEY);

  const merged = {
    ...DEFAULT_PROFILE,
    ...(existing || {}),
    ...profileData,
    key: PROFILE_KEY,
    updatedAt: Date.now(),
  };

  if (!merged.createdAt) {
    merged.createdAt = Date.now();
  }

  // Calculate accountability date only when there
  // isn't already a saved/provided value.
  if (!merged.accountabilityDate && merged.birthDate && merged.gender) {
    merged.accountabilityDate = calculateAccountabilityDateKey(
      merged.birthDate,
      merged.gender,
    );
  }

  await putItem("user_profile", merged);

  notifyProfileUpdated(merged);

  return merged;
}

/**
 * Check if onboarding has been completed.
 */
export async function isOnboardingCompleted() {
  const profile = await loadProfile();

  return profile?.onboardingCompleted === true;
}

/**
 * Mark onboarding as complete and finalize the profile.
 */
export async function completeOnboarding(profileData) {
  return saveProfile({
    ...profileData,
    onboardingCompleted: true,
    prayerTrackingStartDate: todayKey(),
  });
}

/**
 * Reset the profile entirely.
 */
export async function resetProfile() {
  const fresh = {
    ...DEFAULT_PROFILE,
    key: PROFILE_KEY,
  };

  await putItem("user_profile", fresh);

  notifyProfileUpdated(fresh);

  return fresh;
}
