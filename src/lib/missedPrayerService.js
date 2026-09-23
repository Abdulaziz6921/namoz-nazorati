/**
 * Missed prayer handling — checks for prayers that remain uncompleted at end of day
 * and adds them to the qazo balance as specific prayer types.
 *
 * End-of-day is defined as: the time of the last prayer (xufton) has passed
 * and the prayer is still not marked completed. We also run a check on app open
 * for yesterday's missed prayers that haven't been processed yet.
 *
 * A prayer is only added to qazo if:
 *   - It's past the prayer time for that day
 *   - It's not marked completed
 *   - It hasn't already been processed (we track processed dates)
 */

import { getByIndex, putItem, getItem } from "./db";
import { loadProfile } from "./profileService";
import { PRAYERS } from "../constants/prayers";
import { formatDate, todayKey, addDays } from "./dateUtils";
import { getPrayerTimes } from "./prayerTimesService";
import { loadQazoBalance, saveQazoBalance } from "./qazoService";

const PROCESSED_KEY = "missed_prayer_processed";

/**
 * Get the set of dates already processed for missed-prayer conversion.
 */
async function getProcessedDates() {
  const stored = await getItem("settings", PROCESSED_KEY);
  return new Set(stored?.dates || []);
}

/**
 * Mark a date as processed for missed-prayer conversion.
 */
async function markDateProcessed(dateStr) {
  const stored = await getItem("settings", PROCESSED_KEY);
  const dates = new Set(stored?.dates || []);
  dates.add(dateStr);
  await putItem("settings", {
    key: PROCESSED_KEY,
    dates: Array.from(dates),
    updatedAt: Date.now(),
  });
}

/**
 * Parse "HH:MM" into minutes since midnight.
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Check a specific date for missed prayers and add them to qazo balance.
 * A prayer is "missed" if its time has passed and it's not completed.
 *
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} region - Region slug
 * @returns {Promise<{ missed: string[], updated: boolean }>}
 */
export async function processMissedPrayersForDate(dateStr, region) {
  const profile = await loadProfile();

  if (
    profile?.prayerTrackingStartDate &&
    dateStr < profile.prayerTrackingStartDate
  ) {
    return { missed: [], updated: false };
  }

  const processed = await getProcessedDates();
  if (processed.has(dateStr)) {
    return { missed: [], updated: false };
  }

  // Get prayer times for the date
  let dayTimes;
  try {
    dayTimes = await getPrayerTimes(dateStr, region);
  } catch {
    return { missed: [], updated: false };
  }
  if (!dayTimes || !dayTimes.times) {
    return { missed: [], updated: false };
  }

  // Get logs for that date
  const records = await getByIndex("prayer_logs", "byDate", dateStr);
  const logMap = {};
  for (const r of records) {
    logMap[r.prayer] = r;
  }

  const todayStr = todayKey();
  const isToday = dateStr === todayStr;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const missedPrayers = [];

  for (const prayer of PRAYERS) {
    const timeStr = dayTimes.times[prayer.key];
    if (!timeStr) continue;

    const log = logMap[prayer.key];
    if (log?.completed) continue;

    const prayerMin = timeToMinutes(timeStr);
    if (prayerMin === null) continue;

    if (isToday) {
      // Only mark as missed if the prayer time has passed today
      if (nowMin <= prayerMin) continue;
    }

    // For past dates, all uncompleted prayers are missed
    missedPrayers.push(prayer.key);
  }

  if (missedPrayers.length === 0) {
    if (!isToday) {
      await markDateProcessed(dateStr);
    }

    return { missed: [], updated: false };
  }

  // Add each missed prayer to qazo balance (specific prayer type, +1 each)
  const balance = await loadQazoBalance();
  if (!balance || !balance.qazoSetupCompleted) {
    // Can't add to qazo if setup isn't complete
    await markDateProcessed(dateStr);
    return { missed: missedPrayers, updated: false };
  }

  const byPrayer = { ...(balance.byPrayer || {}) };
  for (const key of missedPrayers) {
    byPrayer[key] = (byPrayer[key] || 0) + 1;
  }

  await saveQazoBalance({
    ...balance,
    byPrayer,
  });

  // Log the missed prayers as qazo entries
  for (const key of missedPrayers) {
    const entry = {
      id: `missed_${dateStr}_${key}`,
      date: dateStr,
      prayer: key,
      completed: false,
      missedAt: Date.now(),
      autoAddedToQazo: true,
    };
    await putItem("prayer_logs", entry);
  }

  await markDateProcessed(dateStr);
  return { missed: missedPrayers, updated: true };
}

/**
 * Check yesterday's prayers for missed ones that haven't been processed yet.
 * Called on app open. Also checks today's prayers whose time has already passed.
 *
 * @param {string} region - Region slug
 * @returns {Promise<{ missed: string[], date: string, updated: boolean }>}
 */
export async function checkAndProcessMissedPrayers(region) {
  const yesterday = formatDate(addDays(new Date(), -1));
  const result = await processMissedPrayersForDate(yesterday, region);
  if (result.updated) {
    return { ...result, date: yesterday };
  }

  // Also check today for prayers whose time already passed and are still uncompleted
  return { missed: [], date: null, updated: false };
}
