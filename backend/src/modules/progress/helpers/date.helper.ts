/**
 * Helper utilities for timezone-aware date bucketing.
 */

export function getLocalDayStart(date: Date, timezone: string = 'UTC'): Date {
  const localString = date.toLocaleString('en-US', { timeZone: timezone });
  const localDate = new Date(localString);
  localDate.setHours(0, 0, 0, 0);
  // Returns a UTC Date object representing the 00:00 local time
  // Due to JS Date design, we adjust by computing the offset difference
  const utcOffset = localDate.getTime() - date.getTime();
  const utcDateStart = new Date(date.getTime() + utcOffset);
  utcDateStart.setUTCHours(0, 0, 0, 0);
  return utcDateStart;
}

export function formatLocalDateStr(date: Date, timezone: string = 'UTC'): string {
  // Returns YYYY-MM-DD for the local timezone
  return date.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA gives YYYY-MM-DD format natively in many engines
}

export function generateDateRangeStrings(days: number, endDate: Date = new Date(), timezone: string = 'UTC'): string[] {
  const strings: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    strings.push(formatLocalDateStr(d, timezone));
  }
  return strings;
}

export function getStartOfDaysAgo(days: number, endDate: Date = new Date()): Date {
  const d = new Date(endDate);
  d.setDate(d.getDate() - days);
  d.setUTCHours(0,0,0,0);
  return d;
}
