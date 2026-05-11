/**
 * Games service — business logic for game sessions and progress aggregation.
 */
import { gamesRepo } from '../repo/games.repo.js';
import type {
  CreateGameSessionDto,
  GameProgressSummary,
  ActiveGame,
  MemoryMatchProgress,
  SpacedRetrievalProgress,
} from '../types.js';

const ACTIVE_GAMES: ActiveGame[] = [
  {
    gameType: 'ASSOCIATIVE_MEMORY_MATCH',
    displayName: 'Associative Memory Matching',
    patientDisplayName: 'Memory Match',
    description: 'Practice remembering which item belongs with which place.',
    recommendedFrequency: '3 times per week',
    targetSessionsPerWeek: 3,
    iconName: 'grid-outline',
  },
  {
    gameType: 'SPACED_RETRIEVAL_ORIENTATION',
    displayName: 'Spaced Retrieval Orientation Practice',
    patientDisplayName: 'Orientation Practice',
    description: 'Practice remembering helpful daily information.',
    recommendedFrequency: 'Daily',
    targetSessionsPerWeek: 7,
    iconName: 'help-circle-outline',
  },
];

export class GamesService {
  getActiveGames(): ActiveGame[] {
    return ACTIVE_GAMES;
  }

  async startSession(patientUserId: string, actorUserId: string, actorRole: string, gameType: string, reminderId?: string) {
    return gamesRepo.startSession(patientUserId, actorUserId, actorRole, gameType, reminderId);
  }

  async completeSession(sessionId: string, dto: CreateGameSessionDto) {
    return gamesRepo.completeSession(sessionId, dto);
  }

  async getRecentSessions(patientUserId: string, gameType?: string, limit = 30) {
    return gamesRepo.getSessionsByPatient(patientUserId, gameType, limit);
  }

  async getGameProgress(patientUserId: string, gameType: string): Promise<GameProgressSummary> {
    const sessions = await gamesRepo.getProgressData(patientUserId, gameType);
    const sessionsPlayed = sessions.length;

    if (sessionsPlayed === 0) {
      return {
        gameType,
        summary: {
          sessionsPlayed: 0,
          bestScore: 0,
          latestScore: 0,
          averageScore: 0,
          highestLevelEver: 0,
          lastPlayedAt: null,
          averageAccuracyPercent: 0,
          completedSessions: 0,
          abandonedSessions: 0,
        },
        scoreSeries: [],
        accuracySeries: [],
        levelSeries: [],
        comparison: { deltaVsPreviousSession: 0, deltaVsBest: 0 },
      };
    }

    const scores = sessions.map((s) => s.score ?? 0);
    const bestScore = Math.max(...scores);
    const latestScore = scores[scores.length - 1];
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / sessionsPlayed);

    const highestLevelEver = Math.max(
      ...sessions.map((s) => s.highestLevel ?? s.highestTierReached ?? 0),
    );
    const lastPlayedAt = sessions[sessions.length - 1].startedAt.toISOString();

    const completedSessions = sessions.filter((s) => s.status === 'COMPLETED' || s.completed).length;
    const abandonedSessions = sessions.filter((s) => s.status === 'ABANDONED' || s.quitEarly).length;

    const accuracies = sessions.map((s) => s.accuracyPercent ?? 0).filter((a) => a > 0);
    const averageAccuracyPercent = accuracies.length
      ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
      : 0;

    const previousScore = sessionsPlayed >= 2 ? scores[scores.length - 2] : 0;
    const deltaVsPreviousSession = latestScore - previousScore;
    const deltaVsBest = latestScore - bestScore;

    const scoreSeries = sessions.map((s) => ({
      date: s.startedAt.toISOString().split('T')[0],
      score: s.score ?? 0,
    }));

    const accuracySeries = sessions.map((s) => ({
      date: s.startedAt.toISOString().split('T')[0],
      accuracyPercent: s.accuracyPercent ?? 0,
    }));

    const levelSeries = sessions.map((s) => ({
      date: s.startedAt.toISOString().split('T')[0],
      highestLevel: s.highestLevel ?? s.highestTierReached ?? 0,
    }));

    return {
      gameType,
      summary: {
        sessionsPlayed,
        bestScore,
        latestScore,
        averageScore,
        highestLevelEver,
        lastPlayedAt,
        averageAccuracyPercent,
        completedSessions,
        abandonedSessions,
      },
      scoreSeries,
      accuracySeries,
      levelSeries,
      comparison: { deltaVsPreviousSession, deltaVsBest },
    };
  }

  // Per-game detailed progress
  async getMemoryMatchProgress(patientId: string): Promise<MemoryMatchProgress> {
    const sessions = await gamesRepo.getProgressData(patientId, 'ASSOCIATIVE_MEMORY_MATCH');
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyCompleted = sessions.filter(
      (s) => s.startedAt >= weekStart && (s.status === 'COMPLETED' || s.completed),
    ).length;

    return {
      gameType: 'ASSOCIATIVE_MEMORY_MATCH',
      weeklySessionsCompleted: weeklyCompleted,
      weeklySessionsTarget: 3,
      accuracyTrend: sessions.map((s) => ({
        date: s.startedAt.toISOString().split('T')[0],
        accuracyPercent: s.accuracyPercent ?? 0,
      })),
      levelTrend: sessions.map((s) => ({
        date: s.startedAt.toISOString().split('T')[0],
        level: s.highestLevel ?? s.highestTierReached ?? 0,
      })),
      highestStableLevel: Math.max(...sessions.map((s) => s.highestLevel ?? s.highestTierReached ?? 0), 0),
      averageResponseTimeMs: 0, // populated from metadata if available
      completionVsTarget: Math.min(1, weeklyCompleted / 3),
      recentSessions: sessions.slice(-10).reverse().map((s) => ({
        id: s.id,
        date: s.startedAt.toISOString().split('T')[0],
        score: s.score ?? 0,
        accuracyPercent: s.accuracyPercent ?? 0,
        levelCompleted: s.levelCompleted ?? s.highestLevel ?? s.highestTierReached ?? 0,
        status: String(s.status ?? (s.completed ? 'COMPLETED' : 'ABANDONED')),
      })),
    };
  }

  async getSpacedRetrievalProgress(patientId: string): Promise<SpacedRetrievalProgress> {
    const sessions = await gamesRepo.getProgressData(patientId, 'SPACED_RETRIEVAL_ORIENTATION');
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyCompleted = sessions.filter(
      (s) => s.startedAt >= weekStart && (s.status === 'COMPLETED' || s.completed),
    ).length;

    const cueUses = sessions
      .map((s) => (s.metadata as any)?.cueUseRate ?? 0)
      .filter((v) => v > 0);
    const avgCueUse = cueUses.length ? cueUses.reduce((a, b) => a + b, 0) / cueUses.length : 0;

    return {
      gameType: 'SPACED_RETRIEVAL_ORIENTATION',
      weeklySessionsCompleted: weeklyCompleted,
      weeklySessionsTarget: 7,
      accuracyTrend: sessions.map((s) => ({
        date: s.startedAt.toISOString().split('T')[0],
        accuracyPercent: s.accuracyPercent ?? 0,
      })),
      cueUseRate: Math.round(avgCueUse * 10) / 10,
      masteredItemCount: 0, // populated from srItems if needed
      needsReviewCount: 0,
      learningItemCount: 0,
      completionVsTarget: Math.min(1, weeklyCompleted / 7),
      recentSessions: sessions.slice(-10).reverse().map((s) => ({
        id: s.id,
        date: s.startedAt.toISOString().split('T')[0],
        score: s.score ?? 0,
        accuracyPercent: s.accuracyPercent ?? 0,
        cueUseRate: (s.metadata as any)?.cueUseRate ?? 0,
        status: String(s.status ?? (s.completed ? 'COMPLETED' : 'ABANDONED')),
      })),
      categoryDistribution: [],
    };
  }
}

export const gamesService = new GamesService();
