/**
 * Games controller — HTTP request handlers for game sessions and progress.
 */
import { Request, Response } from 'express';
import { gamesService } from '../service/games.service.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class GamesController {
  /**
   * GET /api/games
   * List active games.
   */
  listGames = async (_req: Request, res: Response) => {
    const games = gamesService.getActiveGames();
    res.json({ games });
  };

  /**
   * POST /api/games/sessions/start
   * Start a new game session.
   */
  startSession = async (req: Request, res: Response) => {
    const user = req.user!;
    const dto = req.body;

    if (!dto.gameType) {
      throw AppError.badRequest('gameType is required');
    }

    const patientUserId = user.role === 'PATIENT' ? user.userId : (dto.patientId ?? req.query.patientId);
    if (!patientUserId) {
      throw AppError.badRequest('patientId is required');
    }

    const session = await gamesService.startSession(
      patientUserId,
      user.userId,
      user.role.toLowerCase(),
      dto.gameType,
      dto.reminderId,
    );

    res.status(201).json({ session });
  };

  /**
   * POST /api/games/sessions/:id/complete-memory-match
   * Complete a Memory Match session.
   */
  completeMemoryMatch = async (req: Request, res: Response) => {
    const user = req.user!;
    const sessionId = req.params.id as string;
    const dto = req.body;

    const session = await gamesService.completeSession(sessionId, {
      ...dto,
      gameType: 'ASSOCIATIVE_MEMORY_MATCH',
      status: dto.quitEarly ? 'ABANDONED' : 'COMPLETED',
    });

    res.json({ session });
  };

  /**
   * POST /api/games/sessions/:id/complete-spaced-retrieval
   * Complete a Spaced Retrieval session.
   */
  completeSpacedRetrieval = async (req: Request, res: Response) => {
    const user = req.user!;
    const sessionId = req.params.id as string;
    const dto = req.body;

    const session = await gamesService.completeSession(sessionId, {
      ...dto,
      gameType: 'SPACED_RETRIEVAL_ORIENTATION',
      status: dto.quitEarly ? 'ABANDONED' : 'COMPLETED',
    });

    res.json({ session });
  };

  /**
   * GET /api/games/sessions?gameType=&limit=30
   * List recent sessions.
   */
  getSessions = async (req: Request, res: Response) => {
    const user = req.user!;
    const gameType = req.query.gameType as string | undefined;
    const limit = parseInt(req.query.limit as string) || 30;
    const patientId = user.role === 'PATIENT' ? user.userId : (req.query.patientId as string);

    if (!patientId) {
      throw AppError.badRequest('patientId is required');
    }

    const sessions = await gamesService.getRecentSessions(patientId, gameType, limit);
    res.json({ sessions });
  };

  /**
   * GET /api/games/progress?gameType=&patientId=
   * Get aggregated progress data.
   */
  getProgress = async (req: Request, res: Response) => {
    const user = req.user!;
    const gameType = req.query.gameType as string;
    const patientId = user.role === 'PATIENT' ? user.userId : (req.query.patientId as string);

    if (!gameType) {
      throw AppError.badRequest('gameType query parameter is required');
    }
    if (!patientId) {
      throw AppError.badRequest('patientId is required');
    }

    const progress = await gamesService.getGameProgress(patientId, gameType);
    res.json(progress);
  };

  /**
   * GET /api/games/progress/memory-match?patientId=
   * Memory Match specific progress.
   */
  getMemoryMatchProgress = async (req: Request, res: Response) => {
    const user = req.user!;
    const patientId = user.role === 'PATIENT' ? user.userId : (req.query.patientId as string);

    if (!patientId) {
      throw AppError.badRequest('patientId is required');
    }

    const progress = await gamesService.getMemoryMatchProgress(patientId);
    res.json(progress);
  };

  /**
   * GET /api/games/progress/spaced-retrieval?patientId=
   * Spaced Retrieval specific progress.
   */
  getSpacedRetrievalProgress = async (req: Request, res: Response) => {
    const user = req.user!;
    const patientId = user.role === 'PATIENT' ? user.userId : (req.query.patientId as string);

    if (!patientId) {
      throw AppError.badRequest('patientId is required');
    }

    const progress = await gamesService.getSpacedRetrievalProgress(patientId);
    res.json(progress);
  };
}

export const gamesController = new GamesController();
