/**
 * pdf-arabic-helpers.ts
 *
 * LTR-fragment isolation and date/number formatting utilities for Arabic PDF export.
 *
 * Problem being solved:
 *   PDFKit is a pure LTR renderer. naqqash.shapeArabicText() shapes Arabic glyphs
 *   and reorders the visual string for LTR display. Embedded LTR fragments (dates,
 *   times, percentages, English words, numbers) inside Arabic lines end up visually
 *   reversed or scrambled unless explicitly isolated.
 *
 * Strategy:
 *   1. Use Unicode LRI (U+2066) / PDI (U+2069) directional isolates around LTR runs.
 *      These are control characters naqqash passes through unchanged.
 *   2. Apply isolation BEFORE calling naqqash.shapeArabicText() so the shaper
 *      treats isolated runs as opaque LTR atoms.
 *   3. Provide explicit date/time/number formatters so locale-based formatting
 *      cannot introduce Eastern Arabic digits or unexpected reversal.
 */

// ── Unicode directional markers ──────────────────────────────────────────────

/** Left-to-Right Isolate — opens a LTR directional isolate scope */
export const LRI = '\u2066';
/** Pop Directional Isolate — closes the most recently opened isolate scope */
export const PDI = '\u2069';
/** Left-to-Right Mark — a zero-width LTR marker used as a fallback */
export const LRM = '\u200E';

// ── Core isolation helpers ────────────────────────────────────────────────────

/**
 * Wrap a value with LRI...PDI so it is rendered left-to-right inside an RTL line.
 * Preferred over ltrSafe() because directional isolates are scope-aware.
 */
export function ltr(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return `${LRI}${String(value)}${PDI}`;
}

/**
 * Wrap a value with LRM markers as a fallback when LRI/PDI might not be supported.
 */
export function ltrSafe(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return `${LRM}${String(value)}${LRM}`;
}

// ── Auto-isolation of LTR fragments inside Arabic strings ─────────────────────

/**
 * Scan `input` for LTR fragments (dates, times, percentages, numbers, English words)
 * and wrap each with LRI...PDI so they display correctly inside an RTL Arabic line.
 *
 * Applied BEFORE naqqash shaping so the shaper treats these atoms as opaque.
 *
 * Replacement order matters — more specific patterns before more generic ones:
 *   1. Already-wrapped fragments (skip — avoid double-wrapping)
 *   2. Dates: DD/MM/YYYY or YYYY-MM-DD
 *   3. Times: HH:MM or HH:MM AM/PM
 *   4. Percentages: 100% or 88.5%
 *   5. Page expressions: Page 1 of 3
 *   6. English words/acronyms (multi-character sequences)
 *   7. Standalone numbers (after everything else so they don't pre-empt patterns above)
 */
export function isolateLtrFragments(input: string): string {
  if (!input) return '';

  // If the string has no Arabic characters, it is entirely LTR — no wrapping needed.
  const hasArabic = /[\u0600-\u06FF\uFE70-\uFEFF]/.test(input);
  if (!hasArabic) return input;

  // Guard: if already wrapped at the top level, skip (caller already isolated this)
  if (input.startsWith(LRI) && input.endsWith(PDI)) return input;

  // NOTE: \b (word-boundary) does not work adjacent to Arabic characters in JavaScript
  // because Arabic code-points are not "word" characters in the \w sense. We use
  // (?<![0-9A-Za-z\u2066]) and (?![0-9A-Za-z\u2069]) lookarounds instead, which
  // correctly detect edges even when the neighbour is an Arabic letter or space.

  return input
    // ── 1. Skip already-isolated fragments ───────────────────────────────────
    // Fragments already wrapped with LRI..PDI won't re-match because the LRI/PDI
    // characters break every boundary check below.

    // ── 2. Dates ─────────────────────────────────────────────────────────────
    // DD/MM/YYYY, YYYY-MM-DD, etc.  Lookarounds replace \b for Arabic adjacency.
    .replace(/(?<![0-9])\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}(?![0-9])/g, m => `${LRI}${m}${PDI}`)

    // ── 3. Times with AM/PM (must come before generic English words) ──────────
    // Match "HH:MM AM" or "HH:MM PM" as a single atom so the AM/PM stays attached.
    .replace(/(?<![0-9])\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)(?![0-9A-Za-z])/g, m => `${LRI}${m}${PDI}`)

    // ── 4. Times without AM/PM ───────────────────────────────────────────────
    .replace(/(?<![0-9])\d{1,2}:\d{2}(?![0-9A-Za-z])/g, m => `${LRI}${m}${PDI}`)

    // ── 5. Percentages ───────────────────────────────────────────────────────
    .replace(/(?<![0-9])\d+(?:\.\d+)?%/g, m => `${LRI}${m}${PDI}`)

    // ── 6. Page expressions (before generic English to prevent "Page" being split off) ──
    .replace(/(?<![A-Za-z\u2066])Page\s+\d+\s+of\s+\d+(?![A-Za-z\u2069])/gi, m => `${LRI}${m}${PDI}`)

    // ── 7. English words / acronyms ──────────────────────────────────────────
    // Minimum 2 ASCII chars.  trimEnd() removes trailing spaces.
    // Already-wrapped fragments won't re-match because LRI/PDI break the char-class.
    .replace(/[A-Za-z][A-Za-z0-9&.,:;()_\- ]*[A-Za-z0-9)]/g, m => `${LRI}${m.trimEnd()}${PDI}`)

    // ── 8. Standalone numbers not already wrapped ─────────────────────────────
    .replace(/(?<![0-9\u2066])\d+(?:\.\d+)?(?![0-9\u2069%\/\-:])/g, m => `${LRI}${m}${PDI}`);
}

// ── Date / Time formatters ────────────────────────────────────────────────────

/**
 * Format a Date as DD/MM/YYYY.
 * In Arabic mode the result is wrapped with LRI...PDI so it renders LTR.
 */
export function formatPdfDate(date: Date, language: 'en' | 'ar'): string {
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = String(date.getFullYear());
  const value = `${day}/${month}/${year}`;
  return language === 'ar' ? ltr(value) : value;
}

/**
 * Format a Date as "DD/MM/YYYY HH:MM".
 * In Arabic mode each fragment is wrapped individually.
 */
export function formatPdfDateTime(date: Date, language: 'en' | 'ar'): string {
  const day     = String(date.getDate()).padStart(2, '0');
  const month   = String(date.getMonth() + 1).padStart(2, '0');
  const year    = String(date.getFullYear());
  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const dateStr = `${day}/${month}/${year}`;
  const timeStr = `${hours}:${minutes}`;
  if (language === 'ar') {
    return `${ltr(dateStr)} ${ltr(timeStr)}`;
  }
  return `${dateStr} ${timeStr}`;
}

/**
 * Format a Date as "DD MonthName YYYY" (verbose, English-only for non-Arabic cover page).
 * For Arabic mode falls back to formatPdfDate.
 */
export function formatPdfDateVerbose(date: Date, language: 'en' | 'ar'): string {
  if (language === 'ar') return formatPdfDate(date, 'ar');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Number / Percentage formatters ────────────────────────────────────────────

/**
 * Format a number for PDF output.
 * In Arabic mode the result is wrapped with LRI...PDI.
 */
export function formatPdfNumber(value: number | string, language: 'en' | 'ar'): string {
  const text = String(value);
  return language === 'ar' ? ltr(text) : text;
}

/**
 * Format a percentage for PDF output (appends % if not already present).
 * In Arabic mode the result is wrapped with LRI...PDI.
 */
export function formatPdfPercent(value: number | string, language: 'en' | 'ar'): string {
  const text = String(value).includes('%') ? String(value) : `${value}%`;
  return language === 'ar' ? ltr(text) : text;
}

/**
 * Build a properly-isolated Arabic footer string, or a plain English footer.
 *
 * Arabic:  "MemoCare • تم الإنشاء في DD/MM/YYYY HH:MM • صفحة N من T"
 * English: "MemoCare • Generated DD/MM/YYYY HH:MM • Page N of T"
 */
export function buildFooterString(
  appName: string,
  now: Date,
  pageNum: number,
  totalPages: number,
  language: 'en' | 'ar',
): string {
  const dateTime = formatPdfDateTime(now, language);
  const page     = formatPdfNumber(pageNum, language);
  const total    = formatPdfNumber(totalPages, language);

  if (language === 'ar') {
    return `${ltr(appName)} • تم الإنشاء في ${dateTime} • صفحة ${page} من ${total}`;
  }
  return `${appName} • Generated ${dateTime} • Page ${pageNum} of ${totalPages}`;
}
