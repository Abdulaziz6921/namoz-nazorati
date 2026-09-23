/**
 * Notification settings — stored in IndexedDB under the "settings" store.
 *
 * Settings shape:
 *   notificationsInitialized: boolean — whether first-time setup is complete
 *   prayerNotifications: boolean      — user's prayer notification preference
 *   qazoReminders: boolean            — user's qazo reminder preference
 *   notificationSound: boolean       — play sound on notification
 *   vibration: boolean                — vibrate on notification
 *   perPrayer: { bomdod: bool, ... }  — individual prayer preferences
 */

import { getItem, putItem } from "./db";
import { PRAYERS } from "../constants/prayers";

const SETTINGS_KEY = "notification_settings";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  key: SETTINGS_KEY,

  // Used to detect first-time notification setup
  notificationsInitialized: false,

  prayerNotifications: true,
  qazoReminders: true,

  // Kept for backwards compatibility with older saved data.
  // No delay UI is shown anymore.
  customDelay: 15,

  notificationSound: true,
  vibration: true,

  perPrayer: PRAYERS.reduce((acc, p) => {
    acc[p.key] = true;
    return acc;
  }, {}),
};

export async function loadNotificationSettings() {
  const stored = await getItem("settings", SETTINGS_KEY);
  if (!stored) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...stored,
    perPrayer: {
      ...DEFAULT_NOTIFICATION_SETTINGS.perPrayer,
      ...(stored.perPrayer || {}),
    },
  };
}

export async function initializeNotificationSettings() {
  const current = await loadNotificationSettings();

  // Already initialized — preserve all existing user choices.
  if (current.notificationsInitialized) {
    return current;
  }

  const initialized = {
    ...current,
    notificationsInitialized: true,
    prayerNotifications: true,
    qazoReminders: true,
    perPrayer: {
      ...current.perPrayer,
    },
  };

  await saveNotificationSettings(initialized);

  return initialized;
}

export async function saveNotificationSettings(settings) {
  const merged = { ...settings, key: SETTINGS_KEY };
  await putItem("settings", merged);
  return merged;
}

export function getEffectiveDelayMinutes(settings) {
  if (!settings) return 3;
  if (settings.reminderDelay === -1) {
    return Math.max(1, settings.customDelay || 15);
  }
  return settings.reminderDelay;
}
