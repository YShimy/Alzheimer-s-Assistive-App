/**
 * Routine Sequence Builder — Exact Difficulty Ladder
 *
 * 7 tiers per specification.
 * Pure functions, no side effects.
 */
import type { DifficultyTier, LevelRecord, AdvancementDecision } from './types';

// ─── Exact Difficulty Ladder ────────────────────────────────

export const DIFFICULTY_LADDER: DifficultyTier[] = [
  // Tier 1: 3-step routine, recognition only
  { 
    tier: 1, 
    stepCount: 3, 
    choiceCount: 2, 
    mode: 'recognition', 
    showImages: true, 
    showHints: true,
    delayBetweenStepsMs: 0 
  },
  // Tier 2: Same 3-step, sequential asking
  { 
    tier: 2, 
    stepCount: 3, 
    choiceCount: 2, 
    mode: 'sequential', 
    showImages: true, 
    showHints: true,
    delayBetweenStepsMs: 0 
  },
  // Tier 3: 4-step routine
  { 
    tier: 3, 
    stepCount: 4, 
    choiceCount: 2, 
    mode: 'sequential', 
    showImages: true, 
    showHints: true,
    delayBetweenStepsMs: 0 
  },
  // Tier 4: 4-step, more choices, less hints
  { 
    tier: 4, 
    stepCount: 4, 
    choiceCount: 3, 
    mode: 'sequential', 
    showImages: true, 
    showHints: false,
    delayBetweenStepsMs: 0 
  },
  // Tier 5: 5-step, reorder middle steps
  { 
    tier: 5, 
    stepCount: 5, 
    choiceCount: 3, 
    mode: 'reorder', 
    showImages: true, 
    showHints: false,
    delayBetweenStepsMs: 500 
  },
  // Tier 6: 5-step, full reorder with delay
  { 
    tier: 6, 
    stepCount: 5, 
    choiceCount: 5, 
    mode: 'reorder', 
    showImages: false, 
    showHints: false,
    delayBetweenStepsMs: 1000 
  },
  // Tier 7: 6-step with distractor
  { 
    tier: 7, 
    stepCount: 6, 
    choiceCount: 7, 
    mode: 'reorder_with_distractor', 
    showImages: false, 
    showHints: false,
    delayBetweenStepsMs: 1000 
  },
];

export const MAX_TIER = 7;
export const MIN_TIER = 1;

/**
 * Get the difficulty tier config by tier number (1-indexed).
 */
export function getTier(tierNumber: number): DifficultyTier {
  const index = Math.max(0, Math.min(tierNumber - 1, DIFFICULTY_LADDER.length - 1));
  return DIFFICULTY_LADDER[index];
}

// ─── Progression Tracking ──────────────────────────────────

export { type LevelRecord };

/**
 * Calculate accuracy percentage from level records.
 */
export function calculateAccuracy(records: LevelRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + r.accuracy, 0);
  return total / records.length;
}

/**
 * Calculate average prompts used.
 */
export function calculateAveragePrompts(records: LevelRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + r.promptsUsed, 0);
  return total / records.length;
}

/**
 * Check if player qualifies for tier upgrade.
 * Rules: At least 90% correct in 2 consecutive sessions AND no more than 1 support prompt.
 */
export function shouldUpgradeTier(recent: LevelRecord[]): boolean {
  if (recent.length < 2) return false;
  
  const lastTwo = recent.slice(-2);
  const highAccuracy = lastTwo.every(r => r.accuracy >= 0.9);
  const lowPrompts = lastTwo.every(r => r.promptsUsed <= 1);
  
  return highAccuracy && lowPrompts;
}

/**
 * Check if player should stay on current tier.
 * Rules: 70-89% accuracy OR high prompt usage.
 */
export function shouldStayOnTier(recent: LevelRecord[]): boolean {
  if (recent.length === 0) return true;
  
  const accuracy = calculateAccuracy(recent);
  const avgPrompts = calculateAveragePrompts(recent);
  
  return (accuracy >= 0.7 && accuracy < 0.9) || avgPrompts > 1;
}

/**
 * Check if player needs support adjustment.
 * Rule: Under 70% correct.
 */
export function needsSupportAdjustment(recent: LevelRecord[]): boolean {
  if (recent.length === 0) return false;
  const accuracy = calculateAccuracy(recent);
  return accuracy < 0.7;
}

// ─── Tier Advancement Logic ─────────────────────────────────

/**
 * Determine next tier based on exact specification.
 */
export function decideNextTier(
  currentTier: number,
  accuracy: number,
  promptsUsed: number,
  history: LevelRecord[]
): AdvancementDecision {
  // At max tier
  if (currentTier >= MAX_TIER) {
    return { nextTier: MAX_TIER, supportMode: false, reason: 'max_tier' };
  }
  
  // History already includes current result from store
  // Check for support needs first (under 70%)
  if (needsSupportAdjustment(history)) {
    return { 
      nextTier: Math.max(currentTier - 1, MIN_TIER),
      supportMode: true, 
      reason: 'support_needed' 
    };
  }
  
  // Check for upgrade eligibility (90%+ with low prompts)
  if (shouldUpgradeTier(history)) {
    return { 
      nextTier: Math.min(currentTier + 1, MAX_TIER), 
      supportMode: false, 
      reason: 'normal_advance' 
    };
  }
  
  // Stay on current tier for mixed performance
  return { 
    nextTier: currentTier, 
    supportMode: promptsUsed > 1, 
    reason: 'stay_mixed' 
  };
}

// ─── Support Mode Configuration ─────────────────────────────

export interface SupportConfig {
  reducedChoiceCount: number;
  showImages: boolean;
  showHints: boolean;
  scoreMultiplier: number;
}

export function getSupportConfig(currentTier: DifficultyTier): SupportConfig {
  return {
    reducedChoiceCount: Math.max(2, currentTier.choiceCount - 1),
    showImages: true,
    showHints: true,
    scoreMultiplier: 0.7, // 70% of base for supported completion
  };
}
