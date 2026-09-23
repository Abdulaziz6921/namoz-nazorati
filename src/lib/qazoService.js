/**
 * Qazo calculation engine.
 *
 * Calculates missed obligatory prayers (qazo) between the user's accountability
 * date (mukallaf) and the date they started praying regularly.
 *
 * Uses exact calendar dates — never years × 365. Accounts for:
 *   - different month lengths
 *   - leap years
 *   - start/end dates
 *   - gender
 *   - menstruation exclusion for females
 *   - user's estimated prayer consistency
 *
 * Five qazo prayer units are counted:
 * Bomdod, Peshin, Asr, Shom, and Xufton.
 *
 * Xufton qazo represents 4 rak'at Xufton farz + 3 rak'at Vitr,
 * counted together as one Xufton qazo unit.
 *
 * Sunnah prayers are excluded.
 *
 * This logic is kept separate from React components so it can be modified
 * independently after Hanafi scholar review.
 */

import { calculateAccountabilityDate } from "./accountability";
import { getItem, putItem } from "./db";
import { CONSISTENCY_OPTIONS } from "../constants/onboarding";

const QAZO_BALANCE_KEY = "qazo_balance";

/** Compute total from individual prayer counters (source of truth). */
function deriveTotal(byPrayer) {
  return Object.values(byPrayer).reduce((sum, v) => sum + (v || 0), 0);
}

const QAZO_PRAYERS = [
  { key: "bomdod", name: "Bomdod", type: "farz" },
  { key: "peshin", name: "Peshin", type: "farz" },
  { key: "asr", name: "Asr", type: "farz" },
  { key: "shom", name: "Shom", type: "farz" },
  { key: "xufton", name: "Xufton", type: "farz" },
];

/**
 * Iterate day-by-day from startDate to endDate (inclusive).
 * Calls callback(year, month, day) for each calendar day.
 */
function eachDay(startDate, endDate, callback) {
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (d <= end) {
    callback(d.getFullYear(), d.getMonth(), d.getDate());
    d.setDate(d.getDate() + 1);
  }
}

/**
 * Count the number of days in a date range (inclusive), using exact calendar math.
 */
function countDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Estimate the number of menstruation days per year for a female user.
 * Uses the profile's menstruationDays value (average cycle days per month).
 */
function menstruationDaysPerYear(menstruationDays) {
  if (!menstruationDays || menstruationDays <= 0) return 0;
  return menstruationDays * 12;
}

/**
 * Estimate total menstruation days in a given date range for a female user.
 * Uses the average monthly cycle × months in the range.
 */
function estimateMenstruationDaysInPeriod(
  startDate,
  endDate,
  menstruationDays,
) {
  if (!menstruationDays || menstruationDays <= 0) return 0;
  const totalDays = countDaysBetween(startDate, endDate);
  const months = totalDays / 30.44;
  return Math.round(months * menstruationDays);
}

/**
 * Get the consistency ratio from the consistency estimate key.
 */
function getConsistencyRatio(consistencyKey) {
  const opt = CONSISTENCY_OPTIONS.find((o) => o.key === consistencyKey);
  if (!opt) return 0;
  return opt.value ?? 0;
}

/**
 * Determine the effective start date for qazo counting.
 * - If the user knows their prayer start date, use the accountability date as start
 *   and the prayer start date as end.
 * - If the user doesn't know, use the accountability date as start and today as end.
 */
function getEffectiveDateRange(profile) {
  const accountabilityDate = profile.accountabilityDate
    ? new Date(profile.accountabilityDate)
    : calculateAccountabilityDate(profile.birthDate, profile.gender);

  let endDate;
  if (
    profile.regularPrayerStartType === "unknown" ||
    !profile.regularPrayerStartDate
  ) {
    endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
  } else {
    endDate = new Date(profile.regularPrayerStartDate);
    endDate.setHours(0, 0, 0, 0);
  }

  const startDate = new Date(accountabilityDate);
  startDate.setHours(0, 0, 0, 0);

  if (endDate < startDate) {
    return { startDate, endDate: startDate, isZero: true };
  }

  return { startDate, endDate, isZero: false };
}

/**
 * Calculate the number of missed days (accounting for menstruation and consistency).
 *
 * @param {Object} profile - The user profile
 * @returns {{ totalDays: number, missedDays: number, menstruationDaysExcluded: number, isEstimate: boolean, startDate: Date, endDate: Date }}
 */
export function calculateMissedDays(profile) {
  const { startDate, endDate, isZero } = getEffectiveDateRange(profile);

  if (isZero) {
    return {
      totalDays: 0,
      missedDays: 0,
      menstruationDaysExcluded: 0,
      isEstimate: true,
      startDate,
      endDate,
    };
  }

  const totalDays = countDaysBetween(startDate, endDate);

  let excludedDays = 0;
  if (profile.gender === "female" && profile.menstruationDays) {
    excludedDays = estimateMenstruationDaysInPeriod(
      startDate,
      endDate,
      profile.menstruationDays,
    );
    if (excludedDays > totalDays) excludedDays = totalDays;
  }

  const effectiveDays = totalDays - excludedDays;
  const consistencyRatio = getConsistencyRatio(profile.consistencyEstimate);
  const prayedDays = Math.round(effectiveDays * consistencyRatio);
  const missedDays = Math.max(0, effectiveDays - prayedDays);

  const isEstimate =
    profile.regularPrayerStartType === "unknown" ||
    profile.regularPrayerStartType === "approximate" ||
    !profile.regularPrayerStartDate ||
    (consistencyRatio > 0 && consistencyRatio < 1);

  return {
    totalDays,
    missedDays,
    menstruationDaysExcluded: excludedDays,
    isEstimate,
    startDate,
    endDate,
  };
}

/**
 * Calculate the qazo balance per prayer type.
 *
 * @param {Object} profile - The user profile
 * @returns {{ total: number, byPrayer: Object<string, number>, isEstimate: boolean, startDate: Date, endDate: Date }}
 */
export function calculateQadaByPrayer(profile) {
  const { missedDays, isEstimate, startDate, endDate } =
    calculateMissedDays(profile);

  const byPrayer = {};
  for (const prayer of QAZO_PRAYERS) {
    byPrayer[prayer.key] = missedDays;
  }

  const total = missedDays * QAZO_PRAYERS.length;

  return {
    total,
    byPrayer,
    isEstimate,
    startDate,
    endDate,
  };
}

/**
 * Calculate the full qazo estimate from the profile.
 * Alias for calculateQadaByPrayer for clarity.
 */
export function calculateQadaEstimate(profile) {
  return calculateQadaByPrayer(profile);
}

/**
 * Load the persisted qazo balance from IndexedDB.
 * Returns null if no balance has been stored.
 */
export async function loadQazoBalance() {
  return getItem("qazo_balance", QAZO_BALANCE_KEY);
}

/**
 * Save the qazo balance to IndexedDB.
 * The total is always derived from byPrayer counters — never stored as the sole source.
 */
export async function saveQazoBalance(balance) {
  const existing = await getItem("qazo_balance", QAZO_BALANCE_KEY);
  const byPrayer = balance.byPrayer || {};
  const merged = {
    ...balance,
    key: QAZO_BALANCE_KEY,
    byPrayer,
    total: deriveTotal(byPrayer),
    updatedAt: Date.now(),
  };
  if (!existing) {
    merged.createdAt = Date.now();
  } else {
    merged.createdAt = existing.createdAt;
  }
  await putItem("qazo_balance", merged);
  return merged;
}

/**
 * Initialize the qazo balance from the calculation engine.
 * This is called after onboarding completes but BEFORE the user confirms.
 * The qazoSetupCompleted flag is false until the user confirms.
 */
export async function initializeQazoBalance(profile) {
  const result = calculateQadaEstimate(profile);

  const initialQazoTotal = deriveTotal(result.byPrayer);

  const balance = {
    key: QAZO_BALANCE_KEY,
    byPrayer: result.byPrayer,
    isEstimate: result.isEstimate,

    startDate: initialQazoTotal > 0 ? result.startDate.toISOString() : null,

    endDate: initialQazoTotal > 0 ? result.endDate.toISOString() : null,

    historicalQazo: initialQazoTotal > 0,

    manuallyAdjusted: false,
    qazoSetupCompleted: false,

    calculationProfile: {
      gender: profile.gender,
      birthDate: profile.birthDate,
      accountabilityDate: profile.accountabilityDate,
      regularPrayerStartDate: profile.regularPrayerStartDate,
      regularPrayerStartType: profile.regularPrayerStartType,
      consistencyEstimate: profile.consistencyEstimate,
      menstruationDays: profile.menstruationDays,
    },
  };

  return saveQazoBalance(balance);
}

export async function recalculateQazoFromProfile(profile) {
  const result = calculateQadaEstimate(profile);

  const newQazoTotal = deriveTotal(result.byPrayer);

  const existingBalance = await loadQazoBalance();

  const updatedBalance = {
    ...(existingBalance || {}),
    key: QAZO_BALANCE_KEY,

    byPrayer: result.byPrayer,
    isEstimate: result.isEstimate,

    startDate: newQazoTotal > 0 ? result.startDate.toISOString() : null,

    endDate: newQazoTotal > 0 ? result.endDate.toISOString() : null,

    historicalQazo: newQazoTotal > 0,

    manuallyAdjusted: false,

    qazoSetupCompleted: true,

    calculationProfile: {
      gender: profile.gender,
      birthDate: profile.birthDate,
      accountabilityDate: profile.accountabilityDate,
      regularPrayerStartDate: profile.regularPrayerStartDate,
      regularPrayerStartType: profile.regularPrayerStartType,
      consistencyEstimate: profile.consistencyEstimate,
      menstruationDays: profile.menstruationDays,
    },
  };

  const savedBalance = await saveQazoBalance(updatedBalance);

  window.dispatchEvent(
    new CustomEvent("qazo-balance-updated", {
      detail: savedBalance,
    }),
  );

  return savedBalance;
}

/**
 * Adjust a single prayer's qazo balance by a delta amount.
 * Also updates the total and marks the balance as manually adjusted.
 *
 * @param {string} prayerKey - The prayer to adjust
 * @param {number} delta - Positive or negative adjustment
 * @param {Object} currentBalance - The current balance object
 * @returns {Object} The updated balance (not yet saved)
 */
export function adjustQadaBalance(prayerKey, delta, currentBalance) {
  const byPrayer = { ...(currentBalance.byPrayer || {}) };
  const current = byPrayer[prayerKey] || 0;
  byPrayer[prayerKey] = Math.max(0, current + delta);

  return {
    ...currentBalance,
    byPrayer,
    total: deriveTotal(byPrayer),
    manuallyAdjusted: true,
  };
}

/**
 * Set a specific prayer's qazo balance to an exact value.
 */
export function setQadaBalance(prayerKey, value, currentBalance) {
  const byPrayer = { ...(currentBalance.byPrayer || {}) };
  byPrayer[prayerKey] = Math.max(0, Math.floor(value));

  return {
    ...currentBalance,
    byPrayer,
    total: deriveTotal(byPrayer),
    manuallyAdjusted: true,
  };
}

/**
 * Confirm the final qazo balance after the user has reviewed and adjusted.
 * Marks setup as completed so the result screen doesn't appear again.
 * Saves the user's confirmed byPrayer values exactly as adjusted.
 *
 * @param {Object} confirmedByPrayer
 * - { bomdod: 730, peshin: 730, asr: 730, shom: 730, xufton: 730 }
 * @param {Object} existingBalance - The initialized balance from IndexedDB
 * @returns {Object} The saved, confirmed balance
 */
export async function confirmQazoBalance(confirmedByPrayer, existingBalance) {
  const confirmed = {
    ...existingBalance,
    byPrayer: { ...confirmedByPrayer },
    total: deriveTotal(confirmedByPrayer),
    qazoSetupCompleted: true,
    manuallyAdjusted: true,
    confirmedAt: Date.now(),
  };
  return saveQazoBalance(confirmed);
}

/**
 * Check whether the user has completed the qazo setup (seen and confirmed the result screen).
 */
export async function isQazoSetupCompleted() {
  const balance = await loadQazoBalance();
  return balance?.qazoSetupCompleted === true;
}

/**
 * Get the total qazo remaining, derived from the individual prayer counters.
 */
export function getQazoTotal(balance) {
  if (!balance?.byPrayer) return 0;
  return deriveTotal(balance.byPrayer);
}

// ─── Qazo Plan ─────────────────────────────────────────────────────────────

const QAZO_PLAN_KEY = "qazo_plan";

export const QAZO_PLAN_OPTIONS = [
  {
    key: "daily_1",
    label: "Kuniga 1 ta",
    description: "Eng yengil va barqaror reja",
    dailyTarget: 1,
  },
  {
    key: "daily_5",
    label: "Kuniga 5 ta",
    description: "Har namozdan 1 tadan qazo ado eting",
    dailyTarget: 5,
  },
  {
    key: "custom",
    label: "O‘zim belgilayman",
    description: "Kunlik miqdorni o‘zingiz tanlang",
    dailyTarget: null,
  },
];

/**
 * Load the qazo plan from IndexedDB.
 */
export async function loadQazoPlan() {
  return getItem("qazo_plan", QAZO_PLAN_KEY);
}

/**
 * Save the qazo plan to IndexedDB.
 */
export async function saveQazoPlan(plan) {
  const existing = await getItem("qazo_plan", QAZO_PLAN_KEY);
  const merged = {
    key: QAZO_PLAN_KEY,
    ...plan,
    updatedAt: Date.now(),
  };
  if (!existing) {
    merged.createdAt = Date.now();
  } else {
    merged.createdAt = existing.createdAt;
  }
  await putItem("qazo_plan", merged);
  return merged;
}

/**
 * Check if a qazo plan has been set up.
 */
export async function isQazoPlanSetupCompleted() {
  const plan = await loadQazoPlan();
  return plan?.planSetupCompleted === true;
}

/**
 * Get the effective daily target, accounting for whether Witr is included.
 * For "after_each" plan: 5 farz prayers × 1 = 5 (Witr excluded by default).
 */
export function getDailyTarget(plan) {
  if (!plan) return 1;

  if (plan.planType === "daily_1") {
    return 1;
  }

  if (plan.planType === "daily_5") {
    return 5;
  }

  if (plan.planType === "custom") {
    return Math.max(1, Number(plan.customDailyTarget) || 1);
  }

  return 1;
}

/**
 * Get the list of prayer keys included in the plan.
 */
export function getPlanPrayers() {
  return QAZO_PRAYERS.map((p) => p.key);
}

/**
 * Calculate estimated completion time from current balance and daily target.
 * Returns { years, months, days, totalDays }.
 */
export function calculateCompletionEstimate(balance, plan) {
  const total = getQazoTotal(balance);
  const dailyTarget = getDailyTarget(plan);
  if (dailyTarget <= 0 || total <= 0) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }
  const totalDays = Math.ceil(total / dailyTarget);
  const years = Math.floor(totalDays / 365);
  const remainingAfterYears = totalDays - years * 365;
  const months = Math.floor(remainingAfterYears / 30.44);
  const days = Math.round(remainingAfterYears - months * 30.44);
  return { years, months, days, totalDays };
}

/**
 * Format the completion estimate as a human-readable string.
 */
export function formatCompletionEstimate(estimate) {
  if (!estimate || estimate.totalDays <= 0) return "—";
  const parts = [];
  if (estimate.years > 0) parts.push(`${estimate.years} yil`);
  if (estimate.months > 0) parts.push(`${estimate.months} oy`);
  if (estimate.days > 0 && estimate.years === 0)
    parts.push(`${estimate.days} kun`);
  return parts.join(" ") || "1 kun";
}

/**
 * Suggest which qazo prayer to perform next based on the current time of day.
 * Maps the current prayer time to the corresponding qazo prayer.
 */
export function suggestQazoPrayer(plan) {
  const hour = new Date().getHours();
  let suggestedKey;
  if (hour >= 5 && hour < 12) suggestedKey = "bomdod";
  else if (hour >= 12 && hour < 16) suggestedKey = "peshin";
  else if (hour >= 16 && hour < 18) suggestedKey = "asr";
  else if (hour >= 18 && hour < 20) suggestedKey = "shom";
  else suggestedKey = "xufton";

  const planPrayers = getPlanPrayers(plan);
  if (planPrayers.includes(suggestedKey)) return suggestedKey;
  return planPrayers[0] || "bomdod";
}

/**
 * Record a qazo completion: decrements the specific prayer counter and logs it.
 * Never decrements a generic total — always updates the specific prayer category.
 *
 * @param {string} prayerKey - Which prayer qazo was performed
 * @param {number} quantity - How many were performed
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Object} currentBalance - Current balance object
 * @returns {Object} { balance, logEntry }
 */
export async function recordQazoCompletion(
  prayerKey,
  quantity,
  dateStr,
  currentBalance,
) {
  const qty = Math.max(1, Math.floor(quantity));

  const byPrayer = { ...(currentBalance.byPrayer || {}) };
  const current = byPrayer[prayerKey] || 0;
  byPrayer[prayerKey] = Math.max(0, current - qty);

  const updatedBalance = {
    ...currentBalance,
    byPrayer,
    total: deriveTotal(byPrayer),
  };
  const savedBalance = await saveQazoBalance(updatedBalance);

  const logEntry = {
    id: `qazo_${dateStr}_${prayerKey}_${Date.now()}`,
    date: dateStr,
    prayer: prayerKey,
    quantity: qty,
    createdAt: Date.now(),
  };
  await putItem("qazo_logs", logEntry);

  return { balance: savedBalance, logEntry };
}

export { QAZO_PRAYERS, QAZO_BALANCE_KEY, QAZO_PLAN_KEY };
