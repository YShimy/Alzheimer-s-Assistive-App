/**
 * Games controller — HTTP request handlers for game sessions and progress.
 */
import { Request, Response } from 'express';
import { gamesService } from '../service/games.service.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class GamesController {
  /**
   * POST /api/games/sessions
   * Save a completed game session with level results.
   */
  saveSession = async (req: Request, res: Response) => {
    const user = req.user!;
    const dto = req.body;

    if (!dto.gameType || !dto.startedAt) {
      throw AppError.badRequest('gameType and startedAt are required');
    }

    // For patients, patientUserId is themselves
    const patientUserId = user.role === 'PATIENT' ? user.userId : dto.patientUserId;
    if (!patientUserId) {
      throw AppError.badRequest('patientUserId is required for caregiver actions');
    }

    const session = await gamesService.saveSession(
      patientUserId,
      user.userId,
      user.role.toLowerCase(),
      dto,
    );

    res.status(201).json(session);
  };

  /**
   * GET /api/games/sessions?gameType=safe_path_memory&limit=30
   * List recent sessions for the authenticated patient.
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
   * GET /api/games/progress?gameType=safe_path_memory
   * Get aggregated progress data for charting.
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
}

export const gamesController = new GamesController();
