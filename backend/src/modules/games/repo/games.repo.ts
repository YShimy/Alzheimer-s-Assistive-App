/**
 * Games repository — Prisma queries for game sessions and level results.
 */
import { prisma } from '../../../shared/db/prisma.js';
import type { CreateGameSessionDto } from '../types.js';

export class GamesRepo {
  async createSession(patientUserId: string, actorUserId: string, actorRole: string, dto: CreateGameSessionDto) {
    const session = await prisma.gameSession.create({
      data: {
        patientUserId,
        gameType: dto.gameType,
        difficultyLevel: dto.highestTierReached ? `tier_${dto.highestTierReached}` : 'easy',
        startedAt: new Date(dto.startedAt),
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        durationSeconds: dto.durationSeconds ?? null,
        score: dto.score ?? null,
        highestTierReached: dto.highestTierReached ?? null,
        levelsPlayed: dto.levelsPlayed ?? 0,
        levelsSucceeded: dto.levelsSucceeded ?? 0,
        levelsFailed: dto.levelsFailed ?? 0,
        completed: dto.completed ?? false,
        quitEarly: dto.quitEarly ?? false,
        actorUserId,
        actorRole,
        source: dto.source ?? 'games',
        metadata: dto.metadata ? (dto.metadata as any) : undefined,
        levelResults: dto.levelResults && dto.levelResults.length > 0
          ? {
              create: dto.levelResults.map((lr) => ({
                levelIndex: lr.levelIndex,
                difficultyTier: lr.difficultyTier,
                gridRows: lr.gridRows,
                gridCols: lr.gridCols,
                bombCount: lr.bombCount,
                previewDurationMs: lr.previewDurationMs,
                solveTimeMs: lr.solveTimeMs ?? null,
                success: lr.success,
                scoreDelta: lr.scoreDelta ?? 0,
                pathLength: lr.pathLength ?? 0,
                retryCount: lr.retryCount ?? 0,
                startedAt: lr.startedAt ? new Date(lr.startedAt) : new Date(),
                completedAt: lr.completedAt ? new Date(lr.completedAt) : null,
                metadata: lr.metadata ? (lr.metadata as any) : undefined,
              })),
            }
          : undefined,
      },
      include: { levelResults: true },
    });
    return session;
  }

  async getSessionsByPatient(patientUserId: string, gameType?: string, limit = 30) {
    return prisma.gameSession.findMany({
      where: {
        patientUserId,
        ...(gameType ? { gameType } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { levelResults: { orderBy: { levelIndex: 'asc' } } },
    });
  }

  async getProgressData(patientUserId: string, gameType: string) {
    const sessions = await prisma.gameSession.findMany({
      where: { patientUserId, gameType },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        score: true,
        highestTierReached: true,
        startedAt: true,
        levelsPlayed: true,
        levelsSucceeded: true,
        levelsFailed: true,
        completed: true,
        quitEarly: true,
        durationSeconds: true,
      },
    });
    return sessions;
  }
}

export const gamesRepo = new GamesRepo();
