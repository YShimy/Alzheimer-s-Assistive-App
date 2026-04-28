/**
 * Safe Path Memory — Exact Scoring System
 *
 * Strong clear: 100 + tier bonus
 * Supported clear: 60 + tier bonus
 * Fail: small participation points (10)
 *
 * Pure functions for calculating scores and building session results.
 */
import type { DifficultyTier, LevelResult, SessionResult, LevelOutcome } from './types';
/**
 * Calculate level score based on exact specification.
 * Strong clear (first try, no support): 100 + tier bonus
 * Supported clear (after retry/support): 60 + tier bonus
 * Fail: 10 points participation
 */
export declare function calculateLevelScore(tier: DifficultyTier, solveTimeMs: number, outcome: LevelOutcome, retryCount: number, supportMode: boolean): number;
/**
 * Determine level outcome based on performance.
 */
export declare function determineLevelOutcome(success: boolean, isFirstTry: boolean, supportMode: boolean): LevelOutcome;
/**
 * Build a session result from accumulated level results.
 */
export declare function buildSessionResult(levelResults: LevelResult[], sessionStartTime: number, quitEarly: boolean, highestTierReached: number, longestStreak: number): SessionResult;
//# sourceMappingURL=scoring.d.ts.map