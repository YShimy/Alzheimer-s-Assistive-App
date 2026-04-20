/**
 * Routine Sequence Builder — Scoring System
 *
 * Pure functions for calculating scores and session results.
 */
import type { DifficultyTier, LevelResult, SessionResult, TestStep } from './types';
import { getSupportConfig } from './difficulty';

// ─── Level Scoring ─────────────────────────────────────────

const BASE_COMPLETE_SCORE = 100;
const BASE_COMPLETE_WITH_SUPPORT = 70;
const BASE_INCOMPLETE_SCORE = 30;

/**
 * Calculate level score based on specification.
 * Complete: 100 + tier bonus
 * Complete with support: 70 + tier bonus
 * Incomplete: 30 participation points
 */
export function calculateLevelScore(
  tier: DifficultyTier,
  testSteps: TestStep[],
  supportMode: boolean,
): number {
  const correctCount = testSteps.filter(s => s.correct).length;
  const totalSteps = testSteps.length;
  const accuracy = totalSteps > 0 ? correctCount / totalSteps : 0;
  
  // Determine outcome
  let baseScore: number;
  if (accuracy >= 0.9) {
    baseScore = supportMode ? BASE_COMPLETE_WITH_SUPPORT : BASE_COMPLETE_SCORE;
  } else if (accuracy >= 0.5) {
    baseScore = BASE_COMPLETE_WITH_SUPPORT; // Partial completion with support
  } else {
    baseScore = BASE_INCOMPLETE_SCORE;
  }
  
  // Tier bonus (10 points per tier)
  let score = baseScore + tier.tier * 10;
  
  // Accuracy bonus for high performers
  if (accuracy >= 0.9) {
    score += 15;
  } else if (accuracy >= 0.75) {
    score += 8;
  }
  
  // Prompt efficiency bonus
  const totalPrompts = testSteps.reduce((sum, s) => sum + s.promptsUsed, 0);
  if (totalPrompts === 0) {
    score += 10;
  } else if (totalPrompts <= 2) {
    score += 5;
  }
  
  return Math.max(0, score);
}

/**
 * Calculate accuracy percentage for a level.
 */
export function calculateLevelAccuracy(testSteps: TestStep[]): number {
  if (testSteps.length === 0) return 0;
  const correct = testSteps.filter(s => s.correct).length;
  return correct / testSteps.length;
}

/**
 * Count total prompts used in a level.
 */
export function countPromptsUsed(testSteps: TestStep[]): number {
  return testSteps.reduce((sum, s) => sum + s.promptsUsed, 0);
}

/**
 * Determine if level was successfully completed.
 * Success = at least 70% correct.
 */
export function isLevelSuccess(testSteps: TestStep[]): boolean {
  return calculateLevelAccuracy(testSteps) >= 0.7;
}

// ─── Session Summary ────────────────────────────────────────

/**
 * Build a session result from accumulated level results.
 */
export function buildSessionResult(
  levelResults: LevelResult[],
  sessionStartTime: number,
  highestTierReached: number,
): SessionResult {
  const now = Date.now();
  const durationSeconds = Math.round((now - sessionStartTime) / 1000);
  const totalScore = levelResults.reduce((sum, lr) => sum + lr.scoreDelta, 0);
  const routinesCompleted = levelResults.filter((lr) => lr.success).length;
  
  const averageAccuracy = levelResults.length > 0
    ? levelResults.reduce((sum, lr) => sum + lr.accuracy, 0) / levelResults.length
    : 0;
    
  const averagePromptsUsed = levelResults.length > 0
    ? levelResults.reduce((sum, lr) => sum + lr.promptsUsed, 0) / levelResults.length
    : 0;

  return {
    gameType: 'routine_sequence',
    startedAt: new Date(sessionStartTime).toISOString(),
    completedAt: new Date(now).toISOString(),
    durationSeconds,
    totalScore,
    highestTierReached,
    routinesAttempted: levelResults.length,
    routinesCompleted,
    averageAccuracy: Math.round(averageAccuracy * 100) / 100,
    averagePromptsUsed: Math.round(averagePromptsUsed * 100) / 100,
    levelResults,
  };
}
