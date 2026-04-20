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
import { getSupportConfig } from './difficulty';

// ─── Level Scoring ─────────────────────────────────────────

const BASE_STRONG_CLEAR = 100;
const BASE_SUPPORTED_CLEAR = 60;
const BASE_FAIL_SCORE = 10; // Small participation points

/**
 * Calculate level score based on exact specification.
 * Strong clear (first try, no support): 100 + tier bonus
 * Supported clear (after retry/support): 60 + tier bonus
 * Fail: 10 points participation
 */
export function calculateLevelScore(
  tier: DifficultyTier,
  solveTimeMs: number,
  outcome: LevelOutcome,
  retryCount: number,
  supportMode: boolean,
): number {
  // Fail: small participation points
  if (outcome === 'fail') {
    return BASE_FAIL_SCORE;
  }

  // Determine if this is a supported clear
  const isSupported = outcome === 'supported_clear' || supportMode || retryCount > 0;
  
  // Base score based on outcome type
  let score = isSupported ? BASE_SUPPORTED_CLEAR : BASE_STRONG_CLEAR;
  
  // Tier bonus (10 points per tier)
  score += tier.tier * 10;
  
  // Small efficiency bonus for no retries (Strong clear only)
  if (!isSupported && retryCount === 0) {
    score += 10;
  }
  
  // Mild speed bonus (capped to avoid pressure)
  const timeRatio = solveTimeMs / tier.targetSolveTimeMs;
  if (timeRatio <= 0.5) score += 10;
  else if (timeRatio <= 0.75) score += 5;

  return Math.max(0, score);
}

/**
 * Determine level outcome based on performance.
 */
export function determineLevelOutcome(
  success: boolean,
  isFirstTry: boolean,
  supportMode: boolean
): LevelOutcome {
  if (!success) return 'fail';
  if (isFirstTry && !supportMode) return 'strong_clear';
  return 'supported_clear';
}

// ─── Session Summary ────────────────────────────────────────

/**
 * Build a session result from accumulated level results.
 */
export function buildSessionResult(
  levelResults: LevelResult[],
  sessionStartTime: number,
  quitEarly: boolean,
  highestTierReached: number,
  longestStreak: number,
): SessionResult {
  const now = Date.now();
  const durationSeconds = Math.round((now - sessionStartTime) / 1000);
  const totalScore = levelResults.reduce((sum, lr) => sum + lr.scoreDelta, 0);
  const levelsSucceeded = levelResults.filter((lr) => lr.success).length;
  const levelsFailed = levelResults.filter((lr) => !lr.success).length;
  const successfulResults = levelResults.filter((lr) => lr.success);
  const bestLevelScore = successfulResults.length > 0
    ? Math.max(...successfulResults.map((lr) => lr.scoreDelta))
    : 0;
  const averageSolveTimeMs = successfulResults.length > 0
    ? Math.round(successfulResults.reduce((sum, lr) => sum + lr.solveTimeMs, 0) / successfulResults.length)
    : 0;

  return {
    gameType: 'safe_path_memory',
    startedAt: new Date(sessionStartTime).toISOString(),
    completedAt: new Date(now).toISOString(),
    durationSeconds,
    totalScore,
    highestTierReached,
    levelsPlayed: levelResults.length,
    levelsSucceeded,
    levelsFailed,
    quitEarly,
    bestLevelScore,
    averageSolveTimeMs,
    longestStreak,
    levelResults,
  };
}
