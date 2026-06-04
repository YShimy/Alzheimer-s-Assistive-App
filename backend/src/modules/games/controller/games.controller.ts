/**
 * Games controller — HTTP request handlers for game sessions and progress.
 */
import { Request, Response } from 'express';
import { gamesService } from '../service/games.service.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { shouldAdvanceLevel, clampLevel } from '../engines/memoryMatch.js';
import { srService } from '../../spaced-retrieval/service/sr.service.js';

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
   * Complete a Memory Match session and compute + persist level progression.
   *
   * The backend owns level computation so it cannot be faked or lost if the
   * user closes the app before "Practice Again" is tapped.
   *
   * Returns { session, nextLevel, levelChange, message }.
   */
  completeMemoryMatch = async (req: Request, res: Response) => {
    const sessionId = req.params.id as string;
    const dto = req.body;

    const session = await gamesService.completeSession(sessionId, {
      ...dto,
      gameType: 'ASSOCIATIVE_MEMORY_MATCH',
      status: dto.quitEarly ? 'ABANDONED' : 'COMPLETED',
    });

    let nextLevel: number = dto.levelStarted ?? 1;
    let levelChange: 'advance' | 'stay' | 'regress' = 'stay';
    let message = '';

    // Compute level progression only for completed (non-quit) sessions
    if (!dto.quitEarly) {
      const accuracyPercent: number = typeof dto.accuracyPercent === 'number' ? dto.accuracyPercent : 0;
      const itemResults: any[] = Array.isArray(dto.itemResults) ? dto.itemResults : [];
      const totalItems = itemResults.length;
      const incorrectFirstTry = itemResults.filter((ir: any) => !ir.firstTryCorrect).length;
      const currentLevel: number = dto.levelStarted ?? 1;

      const decision = shouldAdvanceLevel(accuracyPercent, incorrectFirstTry, totalItems, true);

      if (decision === 'advance') {
        nextLevel = clampLevel(currentLevel + 1);
        levelChange = 'advance';
        message = 'Great work. The next round will be a little more challenging.';
      } else if (decision === 'regress') {
        nextLevel = clampLevel(Math.max(1, currentLevel - 1));
        levelChange = 'regress';
        message = "We'll make the next round a little easier.";
      } else {
        nextLevel = currentLevel;
        levelChange = 'stay';
        message = "Good practice. We'll keep this level for another round.";
      }

      // Persist new level — non-fatal (session data is already safely saved)
      try {
        await srService.setMemoryMatchLevel(session.patientUserId, nextLevel);
      } catch (e) {
        console.error('[games] Failed to persist memory match level:', e);
      }
    }

    res.json({ session, nextLevel, levelChange, message });
  };

  /**
   * POST /api/games/sessions/:id/complete-spaced-retrieval
   * Complete a Spaced Retrieval / My Day & People session.
   */
  completeSpacedRetrieval = async (req: Request, res: Response) => {
    const sessionId = req.params.id as string;
    const dto = req.body;

    const session = await gamesService.completeSession(sessionId, {
      ...dto,
      gameType: 'PERSONAL_ORIENTATION_PRACTICE',
      status: dto.quitEarly ? 'ABANDONED' : 'COMPLETED',
    });

    res.json({ session });
  };

  /**
   * GET /api/games/sessions?gameType=&limit=30
   * List recent sessions for the current patient (or specified patientId).
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
   * Get aggregated progress data for a game type.
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
   * Memory Match specific aggregated progress.
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
   * My Day & People specific aggregated progress.
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
