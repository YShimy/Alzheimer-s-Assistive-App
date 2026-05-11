/**
 * Spaced Retrieval controller — HTTP request handlers for SR items.
 */
import { Request, Response } from 'express';
import { srService } from '../service/sr.service.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class SpacedRetrievalController {
  /**
   * GET /api/patients/:patientId/spaced-retrieval/items
   */
  listItems = async (req: Request, res: Response) => {
    const raw = req.params.patientId as string;
    const patientId = raw === 'me' ? req.user!.userId : raw;
    const activeOnly = req.query.activeOnly !== 'false';
    const items = await srService.listItems(patientId, activeOnly);
    res.json({ items });
  };

  /**
   * POST /api/patients/:patientId/spaced-retrieval/items
   */
  createItem = async (req: Request, res: Response) => {
    const user = req.user!;
    const patientId = req.params.patientId as string;
    const dto = req.body;

    if (!dto.prompt || !dto.correctAnswer) {
      throw AppError.badRequest('prompt and correctAnswer are required');
    }

    const item = await srService.createItem(patientId, user.userId, dto);
    res.status(201).json({ item });
  };

  /**
   * PATCH /api/patients/:patientId/spaced-retrieval/items/:itemId
   */
  updateItem = async (req: Request, res: Response) => {
    const itemId = req.params.itemId as string;
    const dto = req.body;
    const item = await srService.updateItem(itemId, dto);
    res.json({ item });
  };

  /**
   * DELETE /api/patients/:patientId/spaced-retrieval/items/:itemId
   */
  archiveItem = async (req: Request, res: Response) => {
    const itemId = req.params.itemId as string;
    const item = await srService.archiveItem(itemId);
    res.json({ item });
  };
}

export const srController = new SpacedRetrievalController();
