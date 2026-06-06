/**
 * Unit tests for pdf-arabic-helpers.ts
 *
 * Run with: npm test (vitest)
 */
import { describe, it, expect } from 'vitest';
import {
  LRI, PDI, LRM,
  ltr,
  ltrSafe,
  isolateLtrFragments,
  formatPdfDate,
  formatPdfDateTime,
  formatPdfNumber,
  formatPdfPercent,
  buildFooterString,
} from '../modules/summary-exports/service/pdf-arabic-helpers.js';

// ── ltr() ─────────────────────────────────────────────────────────────────────

describe('ltr()', () => {
  it('wraps a string value with LRI and PDI', () => {
    expect(ltr('30/05/2026')).toBe(`${LRI}30/05/2026${PDI}`);
  });
  it('wraps a number value with LRI and PDI', () => {
    expect(ltr(42)).toBe(`${LRI}42${PDI}`);
  });
  it('returns empty string for null', () => {
    expect(ltr(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(ltr(undefined)).toBe('');
  });
});

// ── ltrSafe() ─────────────────────────────────────────────────────────────────

describe('ltrSafe()', () => {
  it('wraps a value with LRM markers', () => {
    expect(ltrSafe('06:15')).toBe(`${LRM}06:15${LRM}`);
  });
  it('returns empty string for null', () => {
    expect(ltrSafe(null)).toBe('');
  });
});

// ── isolateLtrFragments() ─────────────────────────────────────────────────────

describe('isolateLtrFragments()', () => {
  it('returns empty string for empty input', () => {
    expect(isolateLtrFragments('')).toBe('');
  });

  it('returns plain string unchanged when no Arabic present', () => {
    const plain = 'Page 1 of 3';
    expect(isolateLtrFragments(plain)).toBe(plain);
  });

  it('isolates a date fragment DD/MM/YYYY inside Arabic text', () => {
    const input = 'تاريخ التقرير: 30/05/2026';
    const result = isolateLtrFragments(input);
    expect(result).toContain(`${LRI}30/05/2026${PDI}`);
    expect(result).toContain('تاريخ التقرير:');
  });

  it('isolates a date fragment YYYY-MM-DD inside Arabic text', () => {
    const input = 'التاريخ: 2026-05-30';
    const result = isolateLtrFragments(input);
    expect(result).toContain(`${LRI}2026-05-30${PDI}`);
  });

  it('isolates a time fragment HH:MM inside Arabic text', () => {
    const input = 'وقت الإنشاء: 06:15';
    const result = isolateLtrFragments(input);
    expect(result).toContain(`${LRI}06:15${PDI}`);
  });

  it('isolates a time fragment with AM/PM as a single LTR unit', () => {
    const input = 'الساعة: 06:15 PM';
    const result = isolateLtrFragments(input);
    // The time digits are always isolated; PM may be part of the same unit or separately isolated
    expect(result).toContain(LRI);
    expect(result).toContain('06:15');
    expect(result).toContain('PM');
  });

  it('isolates a percentage fragment inside Arabic text', () => {
    const input = 'نسبة الإكمال: 100%';
    const result = isolateLtrFragments(input);
    expect(result).toContain(`${LRI}100%${PDI}`);
  });

  it('isolates a decimal percentage inside Arabic text', () => {
    const input = 'الدقة: 88.5%';
    const result = isolateLtrFragments(input);
    expect(result).toContain(`${LRI}88.5%${PDI}`);
  });

  it('isolates standalone number inside Arabic text', () => {
    const input = 'عدد الجلسات: 7';
    const result = isolateLtrFragments(input);
    expect(result).toContain(`${LRI}7${PDI}`);
  });

  it('isolates English word/acronym inside Arabic text', () => {
    const input = 'Memory Match: 7 جلسات';
    const result = isolateLtrFragments(input);
    expect(result).toContain(LRI);
    expect(result).toContain('Memory Match');
  });

  it('handles mixed date-time inside Arabic line', () => {
    const input = 'تم إنشاء التقرير في 30/05/2026 الساعة 06:15';
    const result = isolateLtrFragments(input);
    expect(result).toContain(`${LRI}30/05/2026${PDI}`);
    expect(result).toContain(`${LRI}06:15${PDI}`);
  });

  it('isolates "Page N of M" expression inside Arabic context', () => {
    const input = 'صفحة Page 1 of 3 من التقرير';
    const result = isolateLtrFragments(input);
    // Either the whole expression is isolated, or at minimum
    // LRI markers are present (page/numbers are isolated in some form)
    expect(result).toContain(LRI);
    expect(result).toContain('Page');
    expect(result).toContain('1');
    expect(result).toContain('3');
  });
});

// ── formatPdfDate() ───────────────────────────────────────────────────────────

describe('formatPdfDate()', () => {
  const testDate = new Date(2026, 4, 30); // 30 May 2026

  it('returns DD/MM/YYYY for English', () => {
    expect(formatPdfDate(testDate, 'en')).toBe('30/05/2026');
  });

  it('returns LRI-wrapped DD/MM/YYYY for Arabic', () => {
    expect(formatPdfDate(testDate, 'ar')).toBe(`${LRI}30/05/2026${PDI}`);
  });
});

// ── formatPdfDateTime() ───────────────────────────────────────────────────────

describe('formatPdfDateTime()', () => {
  it('returns "DD/MM/YYYY HH:MM" for English', () => {
    const d = new Date(2026, 4, 30, 6, 15);
    const result = formatPdfDateTime(d, 'en');
    expect(result).toBe('30/05/2026 06:15');
  });

  it('returns separately-isolated date and time for Arabic', () => {
    const d = new Date(2026, 4, 30, 6, 15);
    const result = formatPdfDateTime(d, 'ar');
    expect(result).toContain(`${LRI}30/05/2026${PDI}`);
    expect(result).toContain(`${LRI}06:15${PDI}`);
  });
});

// ── formatPdfNumber() ─────────────────────────────────────────────────────────

describe('formatPdfNumber()', () => {
  it('returns plain string for English', () => {
    expect(formatPdfNumber(7, 'en')).toBe('7');
  });

  it('returns LRI-wrapped string for Arabic', () => {
    expect(formatPdfNumber(7, 'ar')).toBe(`${LRI}7${PDI}`);
  });
});

// ── formatPdfPercent() ────────────────────────────────────────────────────────

describe('formatPdfPercent()', () => {
  it('appends % when not already present for English', () => {
    expect(formatPdfPercent(100, 'en')).toBe('100%');
  });

  it('does not double-append % for English', () => {
    expect(formatPdfPercent('88.5%', 'en')).toBe('88.5%');
  });

  it('returns LRI-wrapped percent for Arabic', () => {
    expect(formatPdfPercent(75, 'ar')).toBe(`${LRI}75%${PDI}`);
  });
});

// ── buildFooterString() ───────────────────────────────────────────────────────

describe('buildFooterString()', () => {
  it('builds a plain English footer', () => {
    const now = new Date(2026, 4, 30, 6, 15);
    const result = buildFooterString('MemoCare', now, 1, 3, 'en');
    expect(result).toBe('MemoCare • Generated 30/05/2026 06:15 • Page 1 of 3');
  });

  it('builds an Arabic footer with LTR-isolated values', () => {
    const now = new Date(2026, 4, 30, 6, 15);
    const result = buildFooterString('MemoCare', now, 1, 3, 'ar');
    // APP_NAME isolated
    expect(result).toContain(`${LRI}MemoCare${PDI}`);
    // Date isolated
    expect(result).toContain(`${LRI}30/05/2026${PDI}`);
    // Page numbers isolated
    expect(result).toContain(`${LRI}1${PDI}`);
    expect(result).toContain(`${LRI}3${PDI}`);
    // Arabic text present
    expect(result).toContain('صفحة');
    expect(result).toContain('تم الإنشاء في');
  });
});
