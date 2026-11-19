export function calculateSleepDuration(sleepTime, wakeTime) {
  const sleep = new Date(sleepTime);
  const wake = new Date(wakeTime);

  if (
    Number.isNaN(sleep.getTime()) ||
    Number.isNaN(wake.getTime())
  ) {
    return null;
  }

  const duration = wake.getTime() - sleep.getTime();

  if (duration <= 0) return null;

  return Math.floor(duration / 60000);
}

export function formatDuration(minutes) {
  if (
    minutes == null ||
    !Number.isFinite(Number(minutes)) ||
    minutes < 0
  ) {
    return 'Not available';
  }

  const value = Math.floor(Number(minutes));
  const hours = Math.floor(value / 60);
  const mins = value % 60;

  return `${hours}h ${mins}m`;
}

export function calculateGoalProgress(sleepMinutes, goalMinutes) {
  if (
    sleepMinutes == null ||
    goalMinutes == null ||
    goalMinutes <= 0
  ) {
    return {
      percentage: 0,
      remainingMinutes: 0,
      reached: false
    };
  }

  return {
    percentage: Math.round(sleepMinutes / goalMinutes * 100),
    remainingMinutes: Math.max(0, goalMinutes - sleepMinutes),
    reached: sleepMinutes >= goalMinutes
  };
}

/**
 * Returns a local calendar date key in YYYY-MM-DD format.
 */
export function getLocalDateKey(date) {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) return null;

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Creates a local midnight Date from a YYYY-MM-DD date key.
 * Avoids interpreting date-only strings as UTC.
 */
export function getLocalDateFromKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return null;

  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Returns the overlap of a sleep session with a local calendar day,
 * in whole minutes.
 *
 * A session remains one original record. This function only calculates
 * the portion that belongs to the requested date.
 */
export function calculateSleepMinutesForDate(record, dateKey) {
  if (!record || !record.sleepTime || !record.wakeTime) {
    return 0;
  }

  const sleep = new Date(record.sleepTime);
  const wake = new Date(record.wakeTime);
  const dayStart = getLocalDateFromKey(dateKey);

  if (
    Number.isNaN(sleep.getTime()) ||
    Number.isNaN(wake.getTime()) ||
    !dayStart
  ) {
    return 0;
  }

  if (wake.getTime() <= sleep.getTime()) return 0;

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const overlapStart = Math.max(
    sleep.getTime(),
    dayStart.getTime()
  );

  const overlapEnd = Math.min(
    wake.getTime(),
    dayEnd.getTime()
  );

  if (overlapEnd <= overlapStart) return 0;

  return Math.floor((overlapEnd - overlapStart) / 60000);
}

/**
 * Calculates the sleep total for a particular local calendar date
 * across all records, including sessions that began on a previous date.
 */
export function calculateDailySleepTotal(records, dateKey) {
  if (!Array.isArray(records)) return 0;

  return records.reduce((total, record) => {
    return total + calculateSleepMinutesForDate(record, dateKey);
  }, 0);
}

/**
 * Calculates totals for a collection of YYYY-MM-DD date keys.
 *
 * Returns an object keyed by date:
 * {
 *   "2026-11-20": 180,
 *   "2026-11-21": 120
 * }
 */
export function calculateDailySleepTotals(records, dateKeys) {
  if (!Array.isArray(dateKeys)) return {};

  const totals = {};

  for (const dateKey of dateKeys) {
    totals[dateKey] = calculateDailySleepTotal(records, dateKey);
  }

  return totals;
}

/**
 * Returns the daily portions of records that overlap a calendar date.
 *
 * Original records are not modified or split. Each returned item
 * references the original record and adds the portion for that date.
 */
export function getSleepRecordsForDate(records, dateKey) {
  if (!Array.isArray(records)) return [];

  return records
    .map(record => ({
      record,
      minutes: calculateSleepMinutesForDate(record, dateKey)
    }))
    .filter(item => item.minutes > 0);
}

/**
 * Returns the local date keys touched by a sleep session.
 */
export function getSleepDateKeys(record) {
  if (!record || !record.sleepTime || !record.wakeTime) {
    return [];
  }

  const sleep = new Date(record.sleepTime);
  const wake = new Date(record.wakeTime);

  if (
    Number.isNaN(sleep.getTime()) ||
    Number.isNaN(wake.getTime()) ||
    wake.getTime() <= sleep.getTime()
  ) {
    return [];
  }

  const keys = [];
  const current = new Date(
    sleep.getFullYear(),
    sleep.getMonth(),
    sleep.getDate()
  );

  const lastDate = new Date(
    wake.getFullYear(),
    wake.getMonth(),
    wake.getDate()
  );

  while (current.getTime() <= lastDate.getTime()) {
    keys.push(getLocalDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return keys;
}

/**
 * Builds a daily totals map for every calendar date touched
 * by the supplied sleep records.
 */
export function buildSleepDailyTotals(records) {
  if (!Array.isArray(records)) return {};

  const dateKeys = new Set();

  for (const record of records) {
    for (const dateKey of getSleepDateKeys(record)) {
      dateKeys.add(dateKey);
    }
  }

  const totals = {};

  for (const dateKey of dateKeys) {
    totals[dateKey] = calculateDailySleepTotal(records, dateKey);
  }

  return totals;
}