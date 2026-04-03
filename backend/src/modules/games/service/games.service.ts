/**
 * Games service — business logic for game sessions and progress aggregation.
 */
import { gamesRepo } from '../repo/games.repo.js';
import type { CreateGameSessionDto, GameProgressSummary } from '../types.js';

export class GamesService {
  async saveSession(patientUserId: string, actorUserId: string, actorRole: string, dto: CreateGameSessionDto) {
    return gamesRepo.createSession(patientUserId, actorUserId, actorRole, dto);
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
          highestTierEver: 0,
          lastPlayedAt: null,
        },
        scoreSeries: [],
        tierSeries: [],
        comparison: { deltaVsPreviousSession: 0, deltaVsBest: 0 },
      };
    }

    const scores = sessions.map((s) => s.score ?? 0);
    const bestScore = Math.max(...scores);
    const latestScore = scores[scores.length - 1];
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / sessionsPlayed);
    const highestTierEver = Math.max(...sessions.map((s) => s.highestTierReached ?? 0));
    const lastPlayedAt = sessions[sessions.length - 1].startedAt.toISOString();

    const previousScore = sessionsPlayed >= 2 ? scores[scores.length - 2] : 0;
    const deltaVsPreviousSession = latestScore - previousScore;
    const deltaVsBest = latestScore - bestScore;

    const scoreSeries = sessions.map((s) => ({
      date: s.startedAt.toISOString().split('T')[0],
      score: s.score ?? 0,
    }));

    const tierSeries = sessions.map((s) => ({
      date: s.startedAt.toISOString().split('T')[0],
      highestTier: s.highestTierReached ?? 0,
    }));

    return {
      gameType,
      summary: {
        sessionsPlayed,
        bestScore,
        latestScore,
        averageScore,
        highestTierEver,
        lastPlayedAt,
      },
      scoreSeries,
      tierSeries,
      comparison: { deltaVsPreviousSession, deltaVsBest },
    };
  }
}

export const gamesService = new GamesService();
