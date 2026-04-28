/**
 * Safe Path Memory — Exact Difficulty Ladder
 *
 * 11 tiers from Tutorial 0 to Tier 10 per specification.
 * Pure functions, no side effects.
 */
import type { DifficultyTier } from './types';
export declare const DIFFICULTY_LADDER: DifficultyTier[];
export declare const MAX_TIER = 10;
export declare const MIN_TIER = 0;
/**
 * Get the difficulty tier config by tier number (0-indexed, 0-10).
 */
export declare function getTier(tierNumber: number): DifficultyTier;
export type LevelOutcome = 'strong_clear' | 'supported_clear' | 'fail';
export interface LevelRecord {
    tier: number;
    outcome: LevelOutcome;
    timestamp: number;
}
/**
 * Track last 3 level outcomes for advancement decisions.
 * Returns the recent history sliced to last 3.
 */
export declare function getRecentOutcomes(history: LevelRecord[]): LevelRecord[];
/**
 * Check if player qualifies for tier upgrade.
 * Rules: At least 2 of last 3 are 'strong_clear' AND no 2 consecutive fails.
 */
export declare function shouldUpgradeTier(recent: LevelRecord[]): boolean;
/**
 * Check if player needs support adjustment.
 * Rule: 2 consecutive fails on the same tier.
 */
export declare function needsSupportAdjustment(recent: LevelRecord[], currentTier: number): boolean;
export interface AdvancementDecision {
    nextTier: number;
    supportMode: boolean;
    reason: 'normal_advance' | 'stay_mixed' | 'support_needed' | 'max_tier' | 'tutorial_complete';
}
/**
 * Determine next tier and support mode based on exact specification.
 */
export declare function decideNextTier(currentTier: number, levelOutcome: LevelOutcome, history: LevelRecord[], isRetry: boolean): AdvancementDecision;
export interface SupportConfig {
    previewBonusMs: number;
    highlightFirstMove: boolean;
    scoreMultiplier: number;
}
export declare function getSupportConfig(): SupportConfig;
/**
 * Starting lives for each session.
 */
export declare const INITIAL_LIVES = 3;
//# sourceMappingURL=difficulty.d.ts.map