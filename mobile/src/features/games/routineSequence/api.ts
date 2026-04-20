/**
 * Routine Sequence Builder — API Integration
 *
 * Backend communication for saving game sessions and results.
 */
import { apiClient } from '../../../infrastructure/api/client';
import type { SessionResult } from './engine/types';

/**
 * Save a completed game session to the backend.
 */
export async function saveGameSession(
  patientId: string,
  result: SessionResult
): Promise<void> {
  const payload = {
    gameType: 'routine_sequence',
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    durationSeconds: result.durationSeconds,
    score: result.totalScore,
    highestTierReached: result.highestTierReached,
    levelsPlayed: result.routinesAttempted,
    levelsSucceeded: result.routinesCompleted,
    levelsFailed: result.routinesAttempted - result.routinesCompleted,
    completed: true,
    quitEarly: false,
    source: 'patient_app',
    levelResults: result.levelResults.map(lr => ({
      levelIndex: lr.levelIndex,
      difficultyTier: lr.difficultyTier,
      gridRows: 0,
      gridCols: lr.stepCount,
      bombCount: 0,
      previewDurationMs: 0,
      solveTimeMs: 0,
      success: lr.success,
      scoreDelta: lr.scoreDelta,
      pathLength: lr.testSteps.length,
      retryCount: 0,
      startedAt: lr.startedAt,
      completedAt: lr.completedAt,
      metadata: {
        routineId: lr.routineId,
        routineTitle: lr.routineTitle,
        mode: lr.mode,
        accuracy: lr.accuracy,
        promptsUsed: lr.promptsUsed,
      },
    })),
  };

  await apiClient.post('/games/sessions', payload);
}

/**
 * Fetch game progress summary.
 */
export async function getGameProgress(patientId: string): Promise<{
  gameType: string;
  summary: {
    sessionsPlayed: number;
    bestScore: number;
    latestScore: number;
    averageScore: number;
    highestTierEver: number;
  };
  scoreSeries: Array<{ date: string; score: number }>;
}> {
  return apiClient.get(`/games/progress?gameType=routine_sequence`);
}

export const routineSequenceApi = {
  saveGameSession,
  getGameProgress,
};
