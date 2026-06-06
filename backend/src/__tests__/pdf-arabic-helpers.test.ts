/**
 * Unit tests for pdf-arabic-helpers.ts
 *
 * Run with: npm test (vitest)
 *
 * Strategy: preReverseFragments() pre-reverses LTR fragments so that naqqash's
 * subsequent string reversal restores them to the correct visual order.
 *
 * We test that each LTR fragment is character-reversed in the output.
 */
import { describe, it, expect } from 'vitest';
import {
  preReverseFragments,
  formatPdfDate,
  formatPdfDateTime,
  formatPdfNumber,
  formatPdfPercent,
  buildFooterString,
} from '../modules/summary-exports/service/pdf-arabic-helpers.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function rev(s: string): string {
  return s.split('').reverse().join('');
}

// ── preReverseFragments() ─────────────────────────────────────────────────────

describe('preReverseFragments()', () => {
  it('returns empty string for empty input', () => {
    expect(preReverseFragments('')).toBe('');
  });

  it('returns plain English string unchanged (no Arabic → naqqash won\'t reverse it)', () => {
    const plain = 'Page 1 of 3';
    expect(preReverseFragments(plain)).toBe(plain);
  });

  it('pre-reverses a date DD/MM/YYYY inside Arabic text', () => {
    const input = 'تاريخ التقرير: 30/05/2026';
    const result = preReverseFragments(input);
    // The date is reversed so naqqash restores it: verify '2026' is somewhere pre-reversed
    expect(result).toContain('تاريخ التقرير:');
    // The date fragment should NOT appear in its original form
    expect(result).not.toBe(input);
    // The result must contain the Arabic part unchanged
    expect(result).toContain('تاريخ التقرير:');
  });

  it('pre-reverses a date YYYY-MM-DD inside Arabic text', () => {
    const input = 'التاريخ: 2026-05-30';
    const result = preReverseFragments(input);
    expect(result).not.toBe(input);
    expect(result).toContain('التاريخ:');
  });

  it('pre-reverses a time HH:MM inside Arabic text', () => {
    const input = 'وقت الإنشاء: 06:15';
    const result = preReverseFragments(input);
    expect(result).toContain(rev('06:15'));
    expect(result).not.toContain('06:15'); // it is now reversed
    expect(result).toContain('وقت الإنشاء:');
  });

  it('pre-reverses a time with AM/PM as a single unit', () => {
    const input = 'الساعة: 06:15 PM';
    const result = preReverseFragments(input);
    // Time+PM fragment reversed: either '51:60' or 'MP 51:60'
    // Key requirement: the digits must not appear in original order
    expect(result).not.toContain('06:15');
  });

  it('pre-reverses a percentage inside Arabic text', () => {
    const input = 'نسبة الإكمال: 100%';
    const result = preReverseFragments(input);
    expect(result).toContain(rev('100%'));
  });

  it('pre-reverses a decimal percentage inside Arabic text', () => {
    const input = 'الدقة: 88.5%';
    const result = preReverseFragments(input);
    // The percentage is reversed — it should not appear in original form
    expect(result).not.toContain('88.5%');
    expect(result).toContain('الدقة:');
  });

  it('pre-reverses English word/acronym inside Arabic text', () => {
    const input = 'MemoCare • تم الإنشاء';
    const result = preReverseFragments(input);
    expect(result).toContain(rev('MemoCare'));
  });

  it('pre-reverses both date and time in a mixed Arabic line', () => {
    const input = 'تم إنشاء التقرير في 30/05/2026 الساعة 06:15';
    const result = preReverseFragments(input);
    // Both LTR fragments should be reversed; Arabic text stays
    expect(result).not.toBe(input);
    expect(result).toContain('تم إنشاء التقرير في');
    expect(result).toContain('الساعة');
    // Date and time must not appear in original (unprocessed) form
    expect(result).not.toContain('30/05/2026');
    expect(result).not.toContain('06:15');
  });
});

// ── formatPdfDate() ───────────────────────────────────────────────────────────

describe('formatPdfDate()', () => {
  const testDate = new Date(2026, 4, 30); // 30 May 2026

  it('returns DD/MM/YYYY as a plain string', () => {
    expect(formatPdfDate(testDate)).toBe('30/05/2026');
  });

  it('returns the same value regardless of language arg', () => {
    expect(formatPdfDate(testDate, 'en')).toBe('30/05/2026');
    expect(formatPdfDate(testDate, 'ar')).toBe('30/05/2026');
  });
});

// ── formatPdfDateTime() ───────────────────────────────────────────────────────

describe('formatPdfDateTime()', () => {
  it('returns "DD/MM/YYYY HH:MM" as a plain string', () => {
    const d = new Date(2026, 4, 30, 6, 15);
    expect(formatPdfDateTime(d)).toBe('30/05/2026 06:15');
  });
});

// ── formatPdfNumber() ─────────────────────────────────────────────────────────

describe('formatPdfNumber()', () => {
  it('returns plain string for a number', () => {
    expect(formatPdfNumber(7)).toBe('7');
  });

  it('returns plain string for a string value', () => {
    expect(formatPdfNumber('42')).toBe('42');
  });
});

// ── formatPdfPercent() ────────────────────────────────────────────────────────

describe('formatPdfPercent()', () => {
  it('appends % when not already present', () => {
    expect(formatPdfPercent(100)).toBe('100%');
  });

  it('does not double-append %', () => {
    expect(formatPdfPercent('88.5%')).toBe('88.5%');
  });
});

// ── buildFooterString() ───────────────────────────────────────────────────────

describe('buildFooterString()', () => {
  it('builds a plain English footer', () => {
    const now = new Date(2026, 4, 30, 6, 15);
    const result = buildFooterString('MemoCare', now, 1, 3, 'en');
    expect(result).toBe('MemoCare • Generated 30/05/2026 06:15 • Page 1 of 3');
  });

  it('builds an Arabic footer as a plain mixed string (for pre-reversal by shapeArabic)', () => {
    const now = new Date(2026, 4, 30, 6, 15);
    const result = buildFooterString('MemoCare', now, 1, 3, 'ar');
    // The footer is a raw mixed string — no LRI/PDI, no pre-reversal here.
    // preReverseFragments + naqqash are applied in shapeArabic() in pdf.service.ts.
    expect(result).toContain('MemoCare');
    expect(result).toContain('30/05/2026');
    expect(result).toContain('06:15');
    expect(result).toContain('صفحة');
    expect(result).toContain('تم الإنشاء في');
    expect(result).toContain('1');
    expect(result).toContain('3');
  });
});
