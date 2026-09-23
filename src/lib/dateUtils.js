const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

const WEEK_DAYS = ["Du", "Se", "Chor", "Pay", "Juma", "Shan", "Yak"];

export { MONTHS, WEEK_DAYS };

/**
 * Convert a value into a local Date object.
 *
 * Date-only strings (YYYY-MM-DD) are parsed as local dates
 * to prevent timezone-related -1 day problems.
 */
export function toLocalDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "string") {
    // Date-only: YYYY-MM-DD
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, year, month, day] = match;

      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    // ISO date/time or other supported date string
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  return null;
}

/**
 * Format date as YYYY-MM-DD.
 */
export function formatDate(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function todayKey() {
  return formatDate(new Date());
}

/**
 * Format date for display.
 *
 * Example:
 * Dushanba, 30-Sentabr
 */
export function formatDisplayDate(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  return `${getWeekdayName(d.getDay())}, ${d.getDate()}-${getMonthName(
    d.getMonth(),
  )}`;
}

/**
 * Get Uzbek month name.
 *
 * 0 = Yanvar
 * 11 = Dekabr
 */
export function getMonthName(monthIndex) {
  return MONTHS[monthIndex] || "";
}

/**
 * Get Uzbek weekday name.
 *
 * 0 = Yakshanba
 * 6 = Shanba
 */
export function getWeekdayName(dayIndex) {
  return WEEK_DAYS[dayIndex] || "";
}

/**
 * Add days to a date.
 */
export function addDays(date, days) {
  const d = toLocalDate(date);

  if (!d) return null;

  d.setDate(d.getDate() + days);

  return d;
}

/**
 * Format date nicely.
 *
 * Example:
 * "2026-09-30" → "30-sentabr 2026-yil"
 */
export function formatDateNice(date) {
  const dateKey = formatDate(date);

  if (!dateKey) return "—";

  const [year, month, day] = dateKey.split("-");

  return `${Number(day)}-${getMonthName(
    Number(month) - 1,
  ).toLowerCase()} ${year}-yil`;
}

/**
 * Format month and year.
 *
 * Example:
 * "2026-09-30" → "Sentabr 2026"
 */
export function formatMonthYear(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  return `${getMonthName(d.getMonth())} ${d.getFullYear()}`;
}

/**
 * Format only day.
 */
export function formatDay(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  return String(d.getDate());
}

/**
 * Format only month.
 */
export function formatMonth(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  return getMonthName(d.getMonth());
}

/**
 * Format only year.
 */
export function formatYear(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  return String(d.getFullYear());
}

/**
 * Get full weekday name from a date.
 *
 * Example:
 * "2026-09-21" → "Dushanba"
 */
export function formatWeekday(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  return getWeekdayName(d.getDay());
}

/**
 * Get short weekday name from a date.
 *
 * Example:
 * "2026-09-21" → "Du"
 */
export function formatWeekdayShort(date) {
  const d = toLocalDate(date);

  if (!d) return "";

  const shortNames = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

  return shortNames[d.getDay()] || "";
}

/**
 * Convert a date to YYYY-MM-DD for <input type="date">.
 */
export function dateToInputValue(date) {
  return formatDate(date);
}

/**
 * Format number using Uzbek locale.
 */
export function formatNumber(n) {
  return new Intl.NumberFormat("uz-UZ").format(Number(n) || 0);
}
