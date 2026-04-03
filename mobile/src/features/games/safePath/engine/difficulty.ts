/**
 * Safe Path Memory — Difficulty Ladder
 *
 * Deterministic tier progression with adaptive rules.
 * Pure functions, no side effects.
 */
import type { DifficultyTier } from './types';

// ─── Difficulty Ladder ─────────────────────────────────────

export const DIFFICULTY_LADDER: DifficultyTier[] = [
  { tier: 1, gridRows: 4, gridCols: 4, bombCount: 3, previewDurationMs: 3500, targetSolveTimeMs: 15000 },
  { tier: 2, gridRows: 4, gridCols: 4, bombCount: 4, previewDurationMs: 3200, targetSolveTimeMs: 14000 },
  { tier: 3, gridRows: 4, gridCols: 4, bombCount: 5, previewDurationMs: 2800, targetSolveTimeMs: 13000 },
  { tier: 4, gridRows: 5, gridCols: 5, bombCount: 5, previewDurationMs: 2800, targetSolveTimeMs: 18000 },
  { tier: 5, gridRows: 5, gridCols: 5, bombCount: 6, previewDurationMs: 2500, targetSolveTimeMs: 16000 },
  { tier: 6, gridRows: 5, gridCols: 5, bombCount: 7, previewDurationMs: 2200, targetSolveTimeMs: 15000 },
  { tier: 7, gridRows: 6, gridCols: 6, bombCount: 8, previewDurationMs: 2200, targetSolveTimeMs: 22000 },
  { tier: 8, gridRows: 6, gridCols: 6, bombCount: 10, previewDurationMs: 1800, targetSolveTimeMs: 20000 },
];

export const MAX_TIER = DIFFICULTY_LADDER.length;

/**
 * Get the difficulty tier config by tier number (1-indexed).
 */
export function getTier(tierNumber: number): DifficultyTier {
  const index = Math.max(0, Math.min(tierNumber - 1, DIFFICULTY_LADDER.length - 1));
  return DIFFICULTY_LADDER[index];
}

/**
 * Determine the next tier after a successful level.
 * Simple: advance by 1, capped at max.
 */
export function getNextTierOnSuccess(currentTier: number): number {
  return Math.min(currentTier + 1, MAX_TIER);
}

/**
 * Determine the next tier after a failed level.
 * Step down by 1 (min tier 1), to give the player a gentler retry.
 */
export function getNextTierOnFail(currentTier: number): number {
  return Math.max(currentTier - 1, 1);
}

/**
 * Starting lives for each session.
 */
export const INITIAL_LIVES = 3;
