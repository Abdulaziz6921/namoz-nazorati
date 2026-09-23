/**
 * Prayer times service — offline-first.
 *
 * Flow: API → validate/normalize → IndexedDB cache → UI
 *
 * Cache is keyed by BOTH region and date so different regions can never be mixed.
 * UI components never call the API directly — they use these functions.
 *
 * Ready for Step 6 notifications.
 */

import { getItem, putItem, getAll, getByIndex } from "./db";
import { formatDate } from "./dateUtils";

const API_BASE = "https://namoz-vaqti.uz/index.php";
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prayer-times`;
const PRAYER_KEYS = ["bomdod", "quyosh", "peshin", "asr", "shom", "xufton"];
const NAMAZ_KEYS = ["bomdod", "peshin", "asr", "shom", "xufton"];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-flight request deduplication
const inflight = new Map();

function cacheKey(region, dateStr) {
  return `${region}:${dateStr}`;
}

/**
 * Convert DD.MM.YYYY to YYYY-MM-DD
 */
function parseApiDate(apiDate) {
  const [day, month, year] = apiDate.split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Validate that a times object has all required prayer keys with valid HH:MM format.
 */
function isValidTimes(times) {
  if (!times || typeof times !== "object") return false;
  for (const key of PRAYER_KEYS) {
    const v = times[key];
    if (!v || typeof v !== "string" || !/^\d{2}:\d{2}$/.test(v)) return false;
  }
  return true;
}

/**
 * Fetch prayer times for a month from the API.
 * Returns an array of normalized day objects.
 */
async function fetchMonthFromAPI(region, year, month) {
  const ym = `${year}-${String(month + 1).padStart(2, "0")}`;
  const url = `${PROXY_URL}?format=json&lang=lotin&period=${ym}&region=${encodeURIComponent(region)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Hudud topilmadi: ${region}`);
    }
    throw new Error(`API xatolik: ${res.status}`);
  }

  const data = await res.json();

  if (!data || !data.period_table || !Array.isArray(data.period_table)) {
    throw new Error("API javobi noto'g'ri formatda");
  }

  const days = [];
  for (const row of data.period_table) {
    if (!row.date || !isValidTimes(row.times)) continue;
    const dateStr = parseApiDate(row.date);
    days.push({
      date: dateStr,
      region,
      times: {
        bomdod: row.times.bomdod,
        quyosh: row.times.quyosh,
        peshin: row.times.peshin,
        asr: row.times.asr,
        shom: row.times.shom,
        xufton: row.times.xufton,
      },
      cachedAt: Date.now(),
    });
  }

  if (days.length === 0) {
    throw new Error("API dan namoz vaqtlari topilmadi");
  }

  return days;
}

/**
 * Cache day objects in IndexedDB, keyed by region:date.
 */
async function cacheDays(days) {
  for (const day of days) {
    const key = cacheKey(day.region, day.date);
    await putItem("prayer_times", { ...day, key });
  }
}

/**
 * Get cached prayer times for a specific date and region.
 * Returns null if not cached or stale.
 */
async function getCachedDay(region, dateStr) {
  const key = cacheKey(region, dateStr);
  const cached = await getItem("prayer_times", key);
  if (!cached) return null;
  if (cached.region !== region) return null; // safety: never mix regions
  return cached;
}

/**
 * Ensure prayer times for a given month are cached.
 * Fetches from API if not cached, with deduplication.
 */
async function ensureMonthCached(region, year, month) {
  const ym = `${year}-${String(month + 1).padStart(2, "0")}`;
  const inflightKey = `${region}:${ym}`;

  if (inflight.has(inflightKey)) {
    return inflight.get(inflightKey);
  }

  const promise = (async () => {
    try {
      const days = await fetchMonthFromAPI(region, year, month);
      await cacheDays(days);
      return days;
    } finally {
      inflight.delete(inflightKey);
    }
  })();

  inflight.set(inflightKey, promise);
  return promise;
}

/**
 * Get prayer times for a specific date and region.
 * Uses cached data if available, fetches from API otherwise.
 *
 * @param {Date|string} date - Date or date string (YYYY-MM-DD)
 * @param {string} region - Region slug
 * @returns {Promise<{date: string, region: string, times: Object}|null>}
 */
export async function getPrayerTimes(date, region) {
  const dateStr = typeof date === "string" ? date : formatDate(date);
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();

  // Try cache first
  const cached = await getCachedDay(region, dateStr);
  if (cached) return cached;

  // Fetch month from API and cache
  try {
    await ensureMonthCached(region, year, month);
    return await getCachedDay(region, dateStr);
  } catch (err) {
    // Try cache even if stale as fallback
    const stale = await getItem("prayer_times", cacheKey(region, dateStr));
    if (stale && stale.region === region) return stale;
    throw err;
  }
}

/**
 * Get a specific prayer time for a date and region.
 *
 * @param {string} prayer - Prayer key (bomdod, peshin, asr, shom, xufton, quyosh)
 * @param {Date|string} date
 * @param {string} region
 * @returns {Promise<string|null>} - Time in HH:MM format, or null
 */
export async function getPrayerTime(prayer, date, region) {
  const day = await getPrayerTimes(date, region);
  if (!day || !day.times) return null;
  return day.times[prayer] || null;
}

/**
 * Parse "HH:MM" into minutes since midnight.
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Get the current prayer based on the time of day.
 * Returns the prayer whose time has started but the next hasn't begun yet.
 *
 * @param {Date|string} date
 * @param {string} region
 * @returns {Promise<{key: string, label: string, time: string, nextKey: string, nextTime: string}|null>}
 */
export async function getCurrentPrayer(date, region) {
  const day = await getPrayerTimes(date, region);
  if (!day || !day.times) return null;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const ordered = NAMAZ_KEYS.map((key) => ({
    key,
    label: day.times[key] ? key : null,
    time: day.times[key],
    minutes: timeToMinutes(day.times[key]),
  })).filter((p) => p.minutes !== null);

  if (ordered.length === 0) return null;

  let current = null;
  for (let i = 0; i < ordered.length; i++) {
    if (nowMin >= ordered[i].minutes) {
      current = ordered[i];
    }
  }

  if (!current) return null;

  const currentIdx = ordered.findIndex((p) => p.key === current.key);
  const next = currentIdx < ordered.length - 1 ? ordered[currentIdx + 1] : null;

  return {
    key: current.key,
    time: current.time,
    nextKey: next?.key || null,
    nextTime: next?.time || null,
  };
}

/**
 * Get the next upcoming prayer.
 *
 * @param {Date|string} date
 * @param {string} region
 * @returns {Promise<{key: string, time: string}|null>}
 */
export async function getNextPrayer(date, region) {
  const day = await getPrayerTimes(date, region);
  if (!day || !day.times) return null;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const ordered = NAMAZ_KEYS.map((key) => ({
    key,
    time: day.times[key],
    minutes: timeToMinutes(day.times[key]),
  })).filter((p) => p.minutes !== null);

  for (const p of ordered) {
    if (p.minutes > nowMin) {
      return { key: p.key, time: p.time };
    }
  }

  // All prayers for today have passed
  return null;
}

/**
 * Determine the status of each prayer for a given date.
 * Statuses: "completed", "upcoming", "current", "missed"
 *
 * @param {Date|string} date
 * @param {string} region
 * @param {Object} logs - Map of prayerKey -> { completed: boolean }
 * @returns {Promise<Object>} - Map of prayerKey -> { status, time }
 */
export async function getPrayerStatuses(date, region, logs) {
  const day = await getPrayerTimes(date, region);
  if (!day || !day.times) return null;

  const dateStr = typeof date === "string" ? date : formatDate(date);
  const todayStr = formatDate(new Date());
  const isToday = dateStr === todayStr;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const ordered = NAMAZ_KEYS.map((key) => ({
    key,
    time: day.times[key],
    minutes: timeToMinutes(day.times[key]),
  })).filter((p) => p.minutes !== null);

  const statuses = {};
  for (const p of ordered) {
    const log = logs?.[p.key];
    if (log?.completed) {
      statuses[p.key] = { status: "completed", time: p.time };
    } else if (!isToday) {
      // Past or future date — no "upcoming"/"current" status
      statuses[p.key] = { status: "missed", time: p.time };
    } else if (p.minutes > nowMin) {
      statuses[p.key] = { status: "upcoming", time: p.time };
    } else {
      // Time has started but not completed
      statuses[p.key] = { status: "missed", time: p.time };
    }
  }

  return statuses;
}

/**
 * Prefetch prayer times for a month (used for caching ahead of time).
 */
export async function prefetchMonth(region, year, month) {
  try {
    await ensureMonthCached(region, year, month);
  } catch {
    // Silently fail on prefetch — UI will retry when needed
  }
}

/**
 * Get the cached region setting from IndexedDB.
 */
export async function getStoredRegion() {
  const settings = await getItem("settings", "app_settings");
  return settings?.region || null;
}

/**
 * Store the selected region in settings.
 */
export async function setStoredRegion(region) {
  const settings = await getItem("settings", "app_settings");
  const updated = { ...(settings || { key: "app_settings" }), region };
  await putItem("settings", updated);
  return updated;
}
