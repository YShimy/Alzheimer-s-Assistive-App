/**
 * Routine Sequence Builder — Comprehensive Difficulty & Progression Tests
 *
 * Tests cover:
 * - Tier ladder configuration correctness
 * - Same-tier-only history requirement
 * - Upgrade / stay / step-down thresholds
 * - Support mode activation
 * - Edge cases (1 session only, max tier, min tier clamp)
 */
import {
  DIFFICULTY_LADDER,
  getTier,
  shouldUpgradeTier,
  shouldStayOnTier,
  needsSupportAdjustment,
  decideNextTier,
  calculateAccuracy,
  calculateAveragePrompts,
  getSupportConfig,
  MAX_TIER,
  MIN_TIER,
} from '../difficulty';
import type { LevelRecord } from '../types';

// ─── Helpers ────────────────────────────────────────────────

function makeRecord(
  tier: number,
  accuracy: number,
  promptsUsed: number,
): LevelRecord {
  return { tier, accuracy, promptsUsed, timestamp: Date.now() };
}

// ─── getTier ────────────────────────────────────────────────

describe('getTier', () => {
  it('returns correct config for tier 1 (recognition)', () => {
    const tier = getTier(1);
    expect(tier.tier).toBe(1);
    expect(tier.stepCount).toBe(3);
    expect(tier.choiceCount).toBe(2);
    expect(tier.mode).toBe('recognition');
    expect(tier.showImages).toBe(true);
    expect(tier.showHints).toBe(true);
  });

  it('returns correct config for tier 2 (sequential, 3 steps, 2 choices)', () => {
    const tier = getTier(2);
    expect(tier.stepCount).toBe(3);
    expect(tier.choiceCount).toBe(2);
    expect(tier.mode).toBe('sequential');
  });

  it('returns correct config for tier 4 (4-step, 3 choices, no hints)', () => {
    const tier = getTier(4);
    expect(tier.stepCount).toBe(4);
    expect(tier.choiceCount).toBe(3);
    expect(tier.showHints).toBe(false);
  });

  it('returns correct config for tier 7 (6-step, reorder_with_distractor)', () => {
    const tier = getTier(7);
    expect(tier.tier).toBe(7);
    expect(tier.stepCount).toBe(6);
    expect(tier.mode).toBe('reorder_with_distractor');
  });

  it('clamps below MIN_TIER to tier 1', () => {
    const tier = getTier(0);
    expect(tier.tier).toBe(1);
  });

  it('clamps above MAX_TIER to tier 7', () => {
    const tier = getTier(99);
    expect(tier.tier).toBe(7);
  });

  it('DIFFICULTY_LADDER has exactly 7 tiers', () => {
    expect(DIFFICULTY_LADDER).toHaveLength(7);
  });
});

// ─── calculateAccuracy ──────────────────────────────────────

describe('calculateAccuracy', () => {
  it('returns 0 for empty records', () => {
    expect(calculateAccuracy([])).toBe(0);
  });

  it('calculates average correctly', () => {
    const records = [
      makeRecord(1, 0.9, 0),
      makeRecord(1, 0.8, 0),
    ];
    expect(calculateAccuracy(records)).toBeCloseTo(0.85, 10);
  });

  it('handles single record', () => {
    const records = [makeRecord(1, 0.75, 0)];
    expect(calculateAccuracy(records)).toBe(0.75);
  });
});

// ─── calculateAveragePrompts ────────────────────────────────

describe('calculateAveragePrompts', () => {
  it('returns 0 for empty records', () => {
    expect(calculateAveragePrompts([])).toBe(0);
  });

  it('calculates average prompts correctly', () => {
    const records = [
      makeRecord(1, 0.9, 2),
      makeRecord(1, 0.9, 0),
    ];
    expect(calculateAveragePrompts(records)).toBe(1);
  });
});

// ─── shouldUpgradeTier ──────────────────────────────────────

describe('shouldUpgradeTier (same-tier records)', () => {
  it('returns true with 2 sessions >= 90% and <= 1 prompt', () => {
    const records = [
      makeRecord(1, 0.95, 0),
      makeRecord(1, 0.92, 1),
    ];
    expect(shouldUpgradeTier(records)).toBe(true);
  });

  it('returns false with only 1 session (insufficient data)', () => {
    const records = [makeRecord(1, 0.99, 0)];
    expect(shouldUpgradeTier(records)).toBe(false);
  });

  it('returns false when one session has high prompts', () => {
    const records = [
      makeRecord(1, 0.95, 2), // too many prompts
      makeRecord(1, 0.92, 1),
    ];
    expect(shouldUpgradeTier(records)).toBe(false);
  });

  it('returns false when one session is below 90%', () => {
    const records = [
      makeRecord(1, 0.95, 0),
      makeRecord(1, 0.85, 0), // below 90%
    ];
    expect(shouldUpgradeTier(records)).toBe(false);
  });

  it('uses only the last 2 records when more than 2 provided', () => {
    // First two records are bad but last two are good
    const records = [
      makeRecord(2, 0.5, 5), // old bad record
      makeRecord(2, 0.95, 0),
      makeRecord(2, 0.92, 0),
    ];
    expect(shouldUpgradeTier(records)).toBe(true);
  });
});

// ─── needsSupportAdjustment ─────────────────────────────────

describe('needsSupportAdjustment (same-tier records)', () => {
  it('returns false with no records (grace period)', () => {
    expect(needsSupportAdjustment([])).toBe(false);
  });

  it('returns true when average is below 70%', () => {
    const records = [
      makeRecord(3, 0.6, 2),
      makeRecord(3, 0.5, 3),
    ];
    expect(needsSupportAdjustment(records)).toBe(true);
  });

  it('returns false when accuracy is exactly 70%', () => {
    const records = [makeRecord(3, 0.70, 1)];
    expect(needsSupportAdjustment(records)).toBe(false);
  });

  it('returns false when accuracy is above 70%', () => {
    const records = [makeRecord(3, 0.80, 0)];
    expect(needsSupportAdjustment(records)).toBe(false);
  });
});

// ─── shouldStayOnTier ───────────────────────────────────────

describe('shouldStayOnTier', () => {
  it('returns true with no records', () => {
    expect(shouldStayOnTier([])).toBe(true);
  });

  it('returns true for 70-89% accuracy', () => {
    const records = [makeRecord(2, 0.80, 0)];
    expect(shouldStayOnTier(records)).toBe(true);
  });

  it('returns true for high prompt usage even with good accuracy', () => {
    const records = [makeRecord(2, 0.88, 3)];
    expect(shouldStayOnTier(records)).toBe(true);
  });

  it('returns false for 90%+ accuracy with low prompts', () => {
    const records = [
      makeRecord(2, 0.92, 1),
      makeRecord(2, 0.91, 0),
    ];
    expect(shouldStayOnTier(records)).toBe(false);
  });
});

// ─── decideNextTier ─────────────────────────────────────────

describe('decideNextTier (requires same-tier history)', () => {
  it('upgrades when 2 same-tier sessions have >= 90% and <= 1 prompt', () => {
    const history = [
      makeRecord(1, 0.95, 0),
      makeRecord(1, 0.92, 0),
    ];
    const decision = decideNextTier(1, 0.92, 0, history);
    expect(decision.nextTier).toBe(2);
    expect(decision.reason).toBe('normal_advance');
    expect(decision.supportMode).toBe(false);
  });

  it('does NOT upgrade with only 1 session (needs 2)', () => {
    const history = [makeRecord(1, 0.99, 0)];
    const decision = decideNextTier(1, 0.99, 0, history);
    expect(decision.nextTier).toBe(1);
    expect(decision.reason).toBe('stay_mixed');
  });

  it('steps down and enables support mode when below 70%', () => {
    const history = [
      makeRecord(3, 0.5, 3),
      makeRecord(3, 0.6, 2),
    ];
    const decision = decideNextTier(3, 0.55, 2, history);
    expect(decision.nextTier).toBe(2);
    expect(decision.supportMode).toBe(true);
    expect(decision.reason).toBe('support_needed');
  });

  it('cannot step below MIN_TIER (tier 1)', () => {
    const history = [makeRecord(1, 0.4, 4)];
    const decision = decideNextTier(1, 0.4, 4, history);
    expect(decision.nextTier).toBe(MIN_TIER);
    expect(decision.supportMode).toBe(true);
  });

  it('stays on tier for 70-89% accuracy', () => {
    const history = [
      makeRecord(2, 0.80, 1),
      makeRecord(2, 0.75, 2),
    ];
    const decision = decideNextTier(2, 0.80, 1, history);
    expect(decision.nextTier).toBe(2);
    expect(decision.reason).toBe('stay_mixed');
  });

  it('stays at MAX_TIER regardless of performance', () => {
    const history = [
      makeRecord(7, 0.95, 0),
      makeRecord(7, 0.97, 0),
    ];
    const decision = decideNextTier(7, 0.95, 0, history);
    expect(decision.nextTier).toBe(MAX_TIER);
    expect(decision.reason).toBe('max_tier');
  });

  it('sets supportMode when prompts > 1 on stay_mixed', () => {
    const history = [makeRecord(4, 0.82, 3)];
    const decision = decideNextTier(4, 0.82, 3, history);
    expect(decision.nextTier).toBe(4);
    expect(decision.supportMode).toBe(true);
  });

  it('does not set supportMode on stay_mixed when prompts <= 1', () => {
    const history = [makeRecord(4, 0.80, 0)];
    const decision = decideNextTier(4, 0.80, 0, history);
    expect(decision.nextTier).toBe(4);
    expect(decision.supportMode).toBe(false);
  });

  /**
   * Cross-tier contamination test: if caller passes mixed-tier history,
   * results may be wrong. The store prevents this — this test documents the
   * expected same-tier-only contract.
   */
  it('demonstrates that history should be same-tier only (contract test)', () => {
    // All tier 2 records: one at 95%, one at 92% — should upgrade
    const sameTierHistory = [
      makeRecord(2, 0.95, 0),
      makeRecord(2, 0.92, 0),
    ];
    const decision = decideNextTier(2, 0.92, 0, sameTierHistory);
    expect(decision.nextTier).toBe(3);
    expect(decision.reason).toBe('normal_advance');
  });
});

// ─── getSupportConfig ───────────────────────────────────────

describe('getSupportConfig', () => {
  it('reduces choice count by 1 (min 2)', () => {
    const tier = getTier(4); // choiceCount: 3
    const config = getSupportConfig(tier);
    expect(config.reducedChoiceCount).toBe(2);
  });

  it('always shows images and hints in support mode', () => {
    const tier = getTier(6); // showImages: false normally
    const config = getSupportConfig(tier);
    expect(config.showImages).toBe(true);
    expect(config.showHints).toBe(true);
  });

  it('scoreMultiplier is 0.7 for supported completion', () => {
    const tier = getTier(3);
    const config = getSupportConfig(tier);
    expect(config.scoreMultiplier).toBe(0.7);
  });
});
