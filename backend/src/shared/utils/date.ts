/**
 * Lightweight date utilities. No external date library needed for MVP.
 */

/** Returns the current UTC ISO timestamp */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Returns the current Date */
export function now(): Date {
  return new Date();
}

/** Formats a Date to a short date string (YYYY-MM-DD) */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

/** Converts an HH:mm time string and a YYYY-MM-DD date into a full Date */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00.000Z`);
}
