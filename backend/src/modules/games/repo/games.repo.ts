/**
 * Games repository — Prisma queries for game sessions and item results.
 */
import { prisma } from '../../../shared/db/prisma.js';
import type { CreateGameSessionDto } from '../types.js';

export class GamesRepo {
  async startSession(patientUserId: string, actorUserId: string, actorRole: string, gameType: string, reminderId?: string) {
    return prisma.gameSession.create({
      data: {
        patientUserId,
        gameType,
        actorUserId,
        actorRole,
        status: 'IN_PROGRESS',
        reminderId: reminderId ?? null,
        source: 'games',
      },
    });
  }

  async completeSession(sessionId: string, dto: CreateGameSessionDto) {
    const data: any = {
      completedAt: dto.completedAt ? new Date(dto.completedAt) : new Date(),
      durationSeconds: dto.durationSeconds ?? null,
      score: dto.score ?? null,
      accuracyPercent: dto.accuracyPercent ?? null,
      levelStarted: dto.levelStarted ?? null,
      levelCompleted: dto.levelCompleted ?? null,
      highestLevel: dto.highestLevel ?? null,
      status: (dto.status as any) ?? 'COMPLETED',
      completed: dto.status === 'COMPLETED' || dto.completed === true,
      quitEarly: dto.quitEarly ?? false,
      metadata: dto.metadata ? (dto.metadata as any) : undefined,
      // Legacy fields
      highestTierReached: dto.highestTierReached ?? null,
      levelsPlayed: dto.levelsPlayed ?? 0,
      levelsSucceeded: dto.levelsSucceeded ?? 0,
      levelsFailed: dto.levelsFailed ?? 0,
    };

    const itemResultsCreate = dto.itemResults && dto.itemResults.length > 0
      ? {
          create: dto.itemResults.map((ir) => ({
            itemIndex: ir.itemIndex,
            prompt: ir.prompt ?? null,
            correct: ir.correct,
            firstTryCorrect: ir.firstTryCorrect ?? false,
            usedCue: ir.usedCue ?? false,
            responseTimeMs: ir.responseTimeMs ?? null,
            attempts: ir.attempts ?? 1,
            selectedAnswer: ir.selectedAnswer ?? null,
            correctAnswer: ir.correctAnswer ?? null,
            metadata: ir.metadata ? (ir.metadata as any) : undefined,
          })),
        }
      : undefined;

    const levelResultsCreate = dto.levelResults && dto.levelResults.length > 0
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
      : undefined;

    return prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        ...data,
        ...(itemResultsCreate ? { itemResults: itemResultsCreate } : {}),
        ...(levelResultsCreate ? { levelResults: levelResultsCreate } : {}),
      },
      include: { itemResults: true, levelResults: true },
    });
  }

  async getSessionById(sessionId: string) {
    return prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { itemResults: true, levelResults: true },
    });
  }

  async getSessionsByPatient(patientUserId: string, gameType?: string, limit = 30) {
    return prisma.gameSession.findMany({
      where: {
        patientUserId,
        ...(gameType ? { gameType } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { itemResults: { orderBy: { itemIndex: 'asc' } }, levelResults: { orderBy: { levelIndex: 'asc' } } },
    });
  }

  async getProgressData(patientUserId: string, gameType: string) {
    return prisma.gameSession.findMany({
      where: { patientUserId, gameType },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        score: true,
        accuracyPercent: true,
        highestLevel: true,
        highestTierReached: true,
        levelCompleted: true,
        startedAt: true,
        completedAt: true,
        status: true,
        completed: true,
        quitEarly: true,
        durationSeconds: true,
        metadata: true,
      },
    });
  }
}

export const gamesRepo = new GamesRepo();
