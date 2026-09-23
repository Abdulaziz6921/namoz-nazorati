/**
 * Accountability date calculation service.
 *
 * Hanafi methodology:
 *   - Female: 9 years after birth
 *   - Male: 12 years after birth
 *
 * Dates are handled as local calendar dates to avoid timezone shifts.
 */

import { formatDate, todayKey, toLocalDate } from "./dateUtils";

const METHODOLOGIES = {
  hanafi: {
    name: "Hanafiy",
    femaleAge: 9,
    maleAge: 12,
  },
  shafii: {
    name: "Shofiiy",
    femaleAge: 9,
    maleAge: 15,
  },
};

/**
 * Add N years to a calendar date.
 *
 * Feb 29 -> Feb 28 in a non-leap target year.
 */
function addYears(date, years) {
  const result = new Date(date);

  const originalMonth = result.getMonth();
  const originalDay = result.getDate();

  result.setFullYear(result.getFullYear() + years);

  // Handle Feb 29 -> Feb 28 in non-leap years.
  if (originalMonth === 1 && originalDay === 29 && result.getMonth() !== 1) {
    result.setMonth(1, 28);
  }

  return result;
}

/**
 * Calculate accountability date.
 *
 * Returns a Date object.
 */
export function calculateAccountabilityDate(
  birthDate,
  gender,
  methodology = "hanafi",
) {
  const rules = METHODOLOGIES[methodology] || METHODOLOGIES.hanafi;

  const birth = toLocalDate(birthDate);

  if (!birth) {
    return null;
  }

  const age = gender === "female" ? rules.femaleAge : rules.maleAge;

  return addYears(birth, age);
}

/**
 * Calculate accountability date as YYYY-MM-DD.
 *
 * This is useful for storing the date in IndexedDB.
 */
export function calculateAccountabilityDateKey(
  birthDate,
  gender,
  methodology = "hanafi",
) {
  const date = calculateAccountabilityDate(birthDate, gender, methodology);

  return date ? formatDate(date) : "";
}

/**
 * Get the age in completed years.
 */
export function getAge(birthDate, referenceDate = new Date()) {
  const birth = toLocalDate(birthDate);
  const ref = toLocalDate(referenceDate);

  if (!birth || !ref) {
    return 0;
  }

  let age = ref.getFullYear() - birth.getFullYear();

  const hasHadBirthdayThisYear =
    ref.getMonth() > birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() >= birth.getDate());

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  return age;
}

/**
 * Check if a person has reached accountability age.
 */
export function hasReachedAccountability(
  birthDate,
  gender,
  methodology = "hanafi",
) {
  const accountabilityDate = calculateAccountabilityDate(
    birthDate,
    gender,
    methodology,
  );

  if (!accountabilityDate) {
    return false;
  }

  return todayKey() >= formatDate(accountabilityDate);
}

export { METHODOLOGIES };
