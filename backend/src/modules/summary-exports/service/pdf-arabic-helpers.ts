/**
 * pdf-arabic-helpers.ts
 *
 * LTR-fragment protection and date/number formatting utilities for Arabic PDF export.
 *
 * Problem:
 *   PDFKit is a pure LTR renderer. naqqash.shapeArabicText() shapes Arabic glyphs
 *   AND reverses the character order of the whole string so it displays correctly in
 *   a left-to-right renderer. Any embedded LTR fragment (date, number, English word)
 *   is reversed along with the Arabic, making it appear backwards in the PDF.
 *
 *   Note: Unicode directional isolates (LRI U+2066 / PDI U+2069) do NOT work here
 *   because naqqash treats them as regular characters and reverses them too. They also
 *   render as visible boxes in most PDF fonts.
 *
 * Strategy — PRE-REVERSAL:
 *   Since naqqash reverses every character in the string linearly, we can pre-reverse
 *   LTR fragment character sequences BEFORE passing to naqqash. naqqash then reverses
 *   them again → the double reversal restores the correct visual order.
 *
 *   Example: "نسبة: 100%"
 *     1. Pre-reverse LTR fragments: "نسبة: %001"
 *     2. naqqash reverses whole string: "100% :ةبسن" (Arabic shaped)
 *     3. PDFKit renders left→right:  نسبة: 100%  ✓
 *
 *   IMPORTANT: Only apply preReverseFragments to Arabic-mode strings that will be
 *   shaped by naqqash. For English-mode output, return the string unchanged.
 */

// ── Core pre-reversal helpers ──────────────────────────────────────────────────

/**
 * Reverse a string's characters.
 */
function revStr(s: string): string {
  return s.split('').reverse().join('');
}

/**
 * Scan `input` for LTR fragments (dates, times, percentages, numbers, English words)
 * and pre-reverse each fragment's characters so that naqqash's subsequent string
 * reversal restores them to the correct LTR visual order.
 *
 * ONLY call this before passing to naqqash.shapeArabicText().
 * Do NOT call this for English-mode strings or strings without Arabic.
 *
 * Replacement order matters — more specific patterns before more generic ones:
 *   1. Dates: DD/MM/YYYY or YYYY-MM-DD
 *   2. Times with AM/PM
 *   3. Times without AM/PM (HH:MM)
 *   4. Percentages: 88.5%
 *   5. English multi-word phrases / acronyms (e.g. "Memory Match", "Page 1 of 3")
 *   6. Standalone numbers
 */
export function preReverseFragments(input: string): string {
  if (!input) return '';

  // If the string has no Arabic characters, naqqash won't reverse it — return as-is
  const hasArabic = /[\u0600-\u06FF\uFE70-\uFEFF]/.test(input);
  if (!hasArabic) return input;

  // Patterns in priority order (most specific first).
  // We collect ALL match positions from ALL patterns, then replace right-to-left
  // to avoid one replacement affecting subsequent regex matches.
  const patterns = [
    // 1. Dates: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
    /(?<![0-9])\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}(?![0-9])/g,
    // 2. Times with AM/PM (before bare times so the suffix stays attached)
    /(?<![0-9])\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)(?![0-9A-Za-z])/g,
    // 3. Times without AM/PM
    /(?<![0-9])\d{1,2}:\d{2}(?![0-9A-Za-z\/\-])/g,
    // 4. Percentages (number + %)  — must come before standalone numbers
    /(?<![0-9])\d+(?:\.\d+)?%/g,
    // 5. English sequences (Latin letters, digits, common punctuation, min 2 chars)
    /[A-Za-z][A-Za-z0-9&.,:()\- ]*[A-Za-z0-9)]/g,
    // 6. Standalone numbers — only if not already part of a pattern above
    /(?<![0-9\u0660-\u0669])\d+(?:\.\d+)?(?![0-9%\/\-:])/g,
  ];

  // Collect all non-overlapping matches across all patterns
  type Match = { start: number; end: number; text: string };
  const matches: Match[] = [];
  const covered = new Set<number>(); // track which positions are already matched

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(input)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      // Skip if any position in this range is already covered
      let overlap = false;
      for (let i = start; i < end; i++) {
        if (covered.has(i)) { overlap = true; break; }
      }
      if (!overlap) {
        matches.push({ start, end, text: m[0] });
        for (let i = start; i < end; i++) covered.add(i);
      }
    }
  }

  if (matches.length === 0) return input;

  // Replace right-to-left so positions stay valid
  matches.sort((a, b) => b.start - a.start);
  let result = input;
  for (const { start, end, text } of matches) {
    const reversed = text.trimEnd().split('').reverse().join('');
    result = result.slice(0, start) + reversed + result.slice(end);
  }
  return result;
}

// ── Date / Time formatters ─────────────────────────────────────────────────────

/**
 * Format a Date as DD/MM/YYYY.
 * Returns a plain string regardless of language — caller passes it to preReverseFragments
 * or naqqash as needed.
 */
export function formatPdfDate(date: Date, _language?: 'en' | 'ar'): string {
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

/**
 * Format a Date as "DD/MM/YYYY HH:MM".
 * Returns a plain string regardless of language.
 */
export function formatPdfDateTime(date: Date, _language?: 'en' | 'ar'): string {
  const day     = String(date.getDate()).padStart(2, '0');
  const month   = String(date.getMonth() + 1).padStart(2, '0');
  const year    = String(date.getFullYear());
  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format a Date as "DD MonthName YYYY" (verbose, English-only for non-Arabic cover).
 * For Arabic mode falls back to formatPdfDate.
 */
export function formatPdfDateVerbose(date: Date, language: 'en' | 'ar'): string {
  if (language === 'ar') return formatPdfDate(date);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Number / Percentage formatters ────────────────────────────────────────────

/**
 * Format a number for PDF output. Returns a plain string.
 */
export function formatPdfNumber(value: number | string): string {
  return String(value);
}

/**
 * Format a percentage for PDF output (appends % if not already present).
 * Returns a plain string.
 */
export function formatPdfPercent(value: number | string): string {
  return String(value).includes('%') ? String(value) : `${value}%`;
}

// ── Footer builder ─────────────────────────────────────────────────────────────

/**
 * Build the footer string. For Arabic this is a mixed Arabic+LTR line that will be
 * passed through preReverseFragments + naqqash in the caller (shapeArabic).
 * For English it is returned as-is.
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
  const dateTime = formatPdfDateTime(now);

  if (language === 'ar') {
    // Return as a plain Arabic string — preReverseFragments will handle the LTR atoms
    return `${appName} • تم الإنشاء في ${dateTime} • صفحة ${pageNum} من ${totalPages}`;
  }
  return `${appName} • Generated ${dateTime} • Page ${pageNum} of ${totalPages}`;
}
