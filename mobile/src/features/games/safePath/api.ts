/**
 * Safe Path Memory — API Layer
 *
 * Communicates with the backend games module.
 */
import { apiClient } from '../../../infrastructure/api/client';
import type { SessionResult } from './engine/types';

export interface GameProgressResponse {
  gameType: string;
  summary: {
    sessionsPlayed: number;
    bestScore: number;
    latestScore: number;
    averageScore: number;
    highestTierEver: number;
    lastPlayedAt: string | null;
  };
  scoreSeries: Array<{ date: string; score: number }>;
  tierSeries: Array<{ date: string; highestTier: number }>;
  comparison: {
    deltaVsPreviousSession: number;
    deltaVsBest: number;
  };
}

export const safePathApi = {
  /**
   * Save a completed game session to the backend.
   */
  async saveSession(session: SessionResult): Promise<void> {
    await apiClient.post('/games/sessions', {
      gameType: session.gameType,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      durationSeconds: session.durationSeconds,
      score: session.totalScore,
      highestTierReached: session.highestTierReached,
      levelsPlayed: session.levelsPlayed,
      levelsSucceeded: session.levelsSucceeded,
      levelsFailed: session.levelsFailed,
      completed: !session.quitEarly,
      quitEarly: session.quitEarly,
      source: 'games',
      metadata: {
        bestLevelScore: session.bestLevelScore,
        averageSolveTimeMs: session.averageSolveTimeMs,
        longestStreak: session.longestStreak,
      },
      levelResults: session.levelResults.map((lr) => ({
        levelIndex: lr.levelIndex,
        difficultyTier: lr.difficultyTier,
        gridRows: lr.gridRows,
        gridCols: lr.gridCols,
        bombCount: lr.bombCount,
        previewDurationMs: lr.previewDurationMs,
        solveTimeMs: lr.solveTimeMs,
        success: lr.success,
        scoreDelta: lr.scoreDelta,
        pathLength: lr.pathLength,
        retryCount: lr.retryCount,
        startedAt: lr.startedAt,
        completedAt: lr.completedAt,
      })),
    });
  },

  /**
   * Get progress data for charting.
   */
  async getProgress(patientId?: string): Promise<GameProgressResponse> {
    const params = new URLSearchParams({ gameType: 'safe_path_memory' });
    if (patientId) params.set('patientId', patientId);
    return apiClient.get(`/games/progress?${params.toString()}`);
  },
};
