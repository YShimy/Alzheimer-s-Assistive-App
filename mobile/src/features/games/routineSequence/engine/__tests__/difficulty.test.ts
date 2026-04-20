/**
 * Routine Sequence Builder — Difficulty & Progression Tests
 */
import {
  DIFFICULTY_LADDER,
  getTier,
  shouldUpgradeTier,
  shouldStayOnTier,
  needsSupportAdjustment,
  decideNextTier,
  calculateAccuracy,
  type LevelRecord,
  MAX_TIER,
} from '../difficulty';

describe('Routine Sequence Difficulty', () => {
  describe('getTier', () => {
    it('returns correct tier config for tier 1', () => {
      const tier = getTier(1);
      expect(tier.tier).toBe(1);
      expect(tier.stepCount).toBe(3);
      expect(tier.choiceCount).toBe(2);
      expect(tier.mode).toBe('recognition');
    });

    it('returns correct tier config for tier 7 (Max)', () => {
      const tier = getTier(7);
      expect(tier.tier).toBe(7);
      expect(tier.stepCount).toBe(6);
      expect(tier.mode).toBe('reorder_with_distractor');
    });

    it('clamps to max tier', () => {
      const tier = getTier(99);
      expect(tier.tier).toBe(7);
    });
  });

  describe('calculateAccuracy', () => {
    it('calculates average accuracy correctly', () => {
      const records: LevelRecord[] = [
        { tier: 1, accuracy: 0.9, promptsUsed: 0, timestamp: 1 },
        { tier: 1, accuracy: 0.8, promptsUsed: 0, timestamp: 2 },
      ];
      expect(calculateAccuracy(records)).toBeCloseTo(0.85, 10);
    });

    it('returns 0 for empty records', () => {
      expect(calculateAccuracy([])).toBe(0);
    });
  });

  describe('shouldUpgradeTier', () => {
    it('returns true with 90%+ accuracy and low prompts for 2 sessions', () => {
      const records: LevelRecord[] = [
        { tier: 1, accuracy: 0.95, promptsUsed: 0, timestamp: 1 },
        { tier: 1, accuracy: 0.92, promptsUsed: 1, timestamp: 2 },
      ];
      expect(shouldUpgradeTier(records)).toBe(true);
    });

    it('returns false with high prompt usage', () => {
      const records: LevelRecord[] = [
        { tier: 1, accuracy: 0.95, promptsUsed: 2, timestamp: 1 },
        { tier: 1, accuracy: 0.92, promptsUsed: 3, timestamp: 2 },
      ];
      expect(shouldUpgradeTier(records)).toBe(false);
    });

    it('returns false with low accuracy', () => {
      const records: LevelRecord[] = [
        { tier: 1, accuracy: 0.7, promptsUsed: 0, timestamp: 1 },
        { tier: 1, accuracy: 0.75, promptsUsed: 0, timestamp: 2 },
      ];
      expect(shouldUpgradeTier(records)).toBe(false);
    });
  });

  describe('needsSupportAdjustment', () => {
    it('returns true when accuracy is below 70%', () => {
      const records: LevelRecord[] = [
        { tier: 3, accuracy: 0.5, promptsUsed: 0, timestamp: 1 },
      ];
      expect(needsSupportAdjustment(records)).toBe(true);
    });

    it('returns false when accuracy is above 70%', () => {
      const records: LevelRecord[] = [
        { tier: 3, accuracy: 0.8, promptsUsed: 0, timestamp: 1 },
      ];
      expect(needsSupportAdjustment(records)).toBe(false);
    });
  });

  describe('decideNextTier', () => {
    it('upgrades when eligible (90%+ accuracy, low prompts for 2 sessions)', () => {
      // Need 2 sessions at 90%+ to advance
      const history: LevelRecord[] = [
        { tier: 1, accuracy: 0.95, promptsUsed: 0, timestamp: 1 },
        { tier: 1, accuracy: 0.92, promptsUsed: 0, timestamp: 2 },
      ];
      const decision = decideNextTier(1, 0.92, 0, history);
      expect(decision.nextTier).toBe(2);
      expect(decision.reason).toBe('normal_advance');
    });

    it('steps down with support when accuracy is low', () => {
      const history: LevelRecord[] = [
        { tier: 3, accuracy: 0.6, promptsUsed: 2, timestamp: 1 },
      ];
      const decision = decideNextTier(3, 0.6, 2, history);
      expect(decision.nextTier).toBe(2);
      expect(decision.supportMode).toBe(true);
      expect(decision.reason).toBe('support_needed');
    });

    it('stays on current tier for mixed performance', () => {
      const history: LevelRecord[] = [
        { tier: 2, accuracy: 0.8, promptsUsed: 2, timestamp: 1 },
      ];
      const decision = decideNextTier(2, 0.8, 2, history);
      expect(decision.nextTier).toBe(2);
      expect(decision.reason).toBe('stay_mixed');
    });

    it('stays at max tier', () => {
      const history: LevelRecord[] = [{ tier: 7, accuracy: 0.95, promptsUsed: 0, timestamp: 1 }];
      const decision = decideNextTier(7, 0.95, 0, history);
      expect(decision.nextTier).toBe(7);
      expect(decision.reason).toBe('max_tier');
    });

    it('does not upgrade with only 1 session', () => {
      const history: LevelRecord[] = [
        { tier: 1, accuracy: 0.95, promptsUsed: 0, timestamp: 1 },
      ];
      const decision = decideNextTier(1, 0.95, 0, history);
      expect(decision.nextTier).toBe(1); // Stays, need 2 sessions
      expect(decision.reason).toBe('stay_mixed');
    });
  });
});
