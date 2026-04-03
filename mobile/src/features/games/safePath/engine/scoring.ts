/**
 * Safe Path Memory — Scoring System
 *
 * Pure functions for calculating level and session scores.
 * No side effects, fully testable.
 */
import type { DifficultyTier, LevelResult, SessionResult } from './types';

// ─── Level Score ────────────────────────────────────────────

/**
 * Calculate score for a single level.
 *
 * Formula:
 *   baseScore = 100 + (tier * 20) + (bombCount * 10) + ((gridSize - 16) * 5)
 *   timeBonus = max(0, floor((targetSolveTime - actualSolveTime) / 100))
 *   cleanBonus = 25 if no retries, else 0
 *   total = baseScore + timeBonus + cleanBonus
 *
 * On failure: score = 0
 */
export function calculateLevelScore(
  tier: DifficultyTier,
  solveTimeMs: number,
  success: boolean,
  retryCount: number,
): number {
  if (!success) return 0;

  const gridSize = tier.gridRows * tier.gridCols;
  const baseScore = 100 + tier.tier * 20 + tier.bombCount * 10 + Math.max(0, (gridSize - 16) * 5);

  const timeBonus = Math.max(0, Math.floor((tier.targetSolveTimeMs - solveTimeMs) / 100));

  const cleanBonus = retryCount === 0 ? 25 : 0;

  return baseScore + timeBonus + cleanBonus;
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
