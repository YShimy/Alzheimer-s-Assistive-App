/**
 * Spaced Retrieval controller — HTTP request handlers for SR items, settings, level, and game contacts.
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

  /**
   * GET /api/patients/:patientId/spaced-retrieval/settings
   */
  getSettings = async (req: Request, res: Response) => {
    const raw = req.params.patientId as string;
    const patientId = raw === 'me' ? req.user!.userId : raw;
    const settings = await srService.getSettings(patientId);
    res.json({ settings });
  };

  /**
   * PUT /api/patients/:patientId/spaced-retrieval/settings
   */
  upsertSettings = async (req: Request, res: Response) => {
    const user = req.user!;
    const raw = req.params.patientId as string;
    const patientId = raw === 'me' ? user.userId : raw;
    const settings = await srService.upsertSettings(patientId, user.userId, req.body);
    res.json({ settings });
  };

  // ─── Memory Match Level ───────────────────────────────────────────────────

  /**
   * GET /api/patients/:patientId/memory-match/level
   * Returns the patient's persisted Memory Match difficulty level.
   */
  getMemoryMatchLevel = async (req: Request, res: Response) => {
    const raw = req.params.patientId as string;
    const patientId = raw === 'me' ? req.user!.userId : raw;
    const level = await srService.getMemoryMatchLevel(patientId);
    res.json({ level });
  };

  /**
   * PUT /api/patients/:patientId/memory-match/level
   * Body: { level: number } — saves the patient's current Memory Match level.
   */
  setMemoryMatchLevel = async (req: Request, res: Response) => {
    const raw = req.params.patientId as string;
    const patientId = raw === 'me' ? req.user!.userId : raw;
    const { level } = req.body;

    if (typeof level !== 'number' || level < 1 || level > 12) {
      throw AppError.badRequest('level must be a number between 1 and 12');
    }

    await srService.setMemoryMatchLevel(patientId, level);
    res.json({ level: Math.max(1, Math.min(12, level)) });
  };

  // ─── Game Contacts ────────────────────────────────────────────────────────

  /**
   * GET /api/patients/:patientId/spaced-retrieval/game-contacts
   * Returns contacts eligible for people-recognition practice questions.
   * Respects includePeopleWithoutPhotos and includeSensitiveContacts from settings.
   */
  getGameContacts = async (req: Request, res: Response) => {
    const raw = req.params.patientId as string;
    const patientId = raw === 'me' ? req.user!.userId : raw;
    const contacts = await srService.getGameContacts(patientId);

    const result = contacts.map((c: any) => {
      // Pick the best memo: prefer one with a photo, then most recent
      const memos = c.memos ?? [];
      const bestMemo =
        memos.find((m: any) => m.photoAsset?.publicUrl) ??
        memos[0] ??
        null;

      return {
        id: c.id,
        displayName: c.displayName,
        relationLabel: bestMemo?.relationLabel ?? null,
        shortMemo: bestMemo?.shortMemo ?? null,
        photoUrl: bestMemo?.photoAsset?.publicUrl ?? null,
        supportRole: bestMemo?.supportRole ?? null,
        isSensitive: bestMemo?.isSensitive ?? false,
      };
    });

    res.json({ contacts: result });
  };
}

export const srController = new SpacedRetrievalController();
