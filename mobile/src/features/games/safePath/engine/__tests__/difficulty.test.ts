/**
 * Safe Path Memory — Difficulty & Progression Tests
 */
import {
  DIFFICULTY_LADDER,
  getTier,
  shouldUpgradeTier,
  needsSupportAdjustment,
  decideNextTier,
  type LevelRecord,
  MAX_TIER,
  MIN_TIER,
} from '../difficulty';

describe('Safe Path Difficulty', () => {
  describe('getTier', () => {
    it('returns correct tier config for tier 0 (Tutorial)', () => {
      const tier = getTier(0);
      expect(tier.tier).toBe(0);
      expect(tier.gridRows).toBe(3);
      expect(tier.gridCols).toBe(3);
      expect(tier.bombCount).toBe(0);
    });

    it('returns correct tier config for tier 10 (Max)', () => {
      const tier = getTier(10);
      expect(tier.tier).toBe(10);
      expect(tier.gridRows).toBe(6);
      expect(tier.gridCols).toBe(6);
      expect(tier.bombCount).toBe(7);
    });

    it('clamps to min tier', () => {
      const tier = getTier(-1);
      expect(tier.tier).toBe(0);
    });

    it('clamps to max tier', () => {
      const tier = getTier(99);
      expect(tier.tier).toBe(10);
    });
  });

  describe('shouldUpgradeTier', () => {
    it('returns true when 2 of last 3 are strong_clear with no consecutive fails', () => {
      const history: LevelRecord[] = [
        { tier: 1, outcome: 'strong_clear', timestamp: 1 },
        { tier: 1, outcome: 'strong_clear', timestamp: 2 },
        { tier: 1, outcome: 'supported_clear', timestamp: 3 },
      ];
      expect(shouldUpgradeTier(history)).toBe(true);
    });

    it('returns false with 2 consecutive fails', () => {
      const history: LevelRecord[] = [
        { tier: 1, outcome: 'fail', timestamp: 1 },
        { tier: 1, outcome: 'fail', timestamp: 2 },
        { tier: 1, outcome: 'strong_clear', timestamp: 3 },
      ];
      expect(shouldUpgradeTier(history)).toBe(false);
    });

    it('returns false with only 1 strong_clear', () => {
      const history: LevelRecord[] = [
        { tier: 1, outcome: 'strong_clear', timestamp: 1 },
        { tier: 1, outcome: 'supported_clear', timestamp: 2 },
        { tier: 1, outcome: 'supported_clear', timestamp: 3 },
      ];
      expect(shouldUpgradeTier(history)).toBe(false);
    });
  });

  describe('needsSupportAdjustment', () => {
    it('returns true with 2 consecutive fails on same tier', () => {
      const history: LevelRecord[] = [
        { tier: 3, outcome: 'fail', timestamp: 1 },
        { tier: 3, outcome: 'fail', timestamp: 2 },
      ];
      expect(needsSupportAdjustment(history, 3)).toBe(true);
    });

    it('returns false when fails are on different tiers', () => {
      const history: LevelRecord[] = [
        { tier: 2, outcome: 'fail', timestamp: 1 },
        { tier: 3, outcome: 'fail', timestamp: 2 },
      ];
      expect(needsSupportAdjustment(history, 3)).toBe(false);
    });
  });

  describe('decideNextTier', () => {
    it('advances from Tutorial 0 to tier 1', () => {
      const decision = decideNextTier(0, 'strong_clear', [], false);
      expect(decision.nextTier).toBe(1);
      expect(decision.reason).toBe('tutorial_complete');
    });

    it('upgrades when eligible', () => {
      const history: LevelRecord[] = [
        { tier: 1, outcome: 'strong_clear', timestamp: 1 },
        { tier: 1, outcome: 'strong_clear', timestamp: 2 },
      ];
      const decision = decideNextTier(1, 'strong_clear', history, false);
      expect(decision.nextTier).toBe(2);
      expect(decision.reason).toBe('normal_advance');
    });

    it('triggers support mode on 2 consecutive fails', () => {
      const history: LevelRecord[] = [
        { tier: 3, outcome: 'fail', timestamp: 1 },
        { tier: 3, outcome: 'fail', timestamp: 2 },
      ];
      const decision = decideNextTier(3, 'fail', history, false);
      expect(decision.supportMode).toBe(true);
      expect(decision.reason).toBe('support_needed');
    });

    it('stays at max tier', () => {
      const decision = decideNextTier(10, 'strong_clear', [], false);
      expect(decision.nextTier).toBe(10);
      expect(decision.reason).toBe('max_tier');
    });
  });
});
