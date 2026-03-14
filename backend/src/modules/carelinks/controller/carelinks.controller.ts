import type { Request, Response } from 'express';
import { carelinksService } from '../service/carelinks.service.js';

export const carelinksController = {
  /**
   * POST /api/carelinks/invite
   */
  async createInvite(req: Request, res: Response): Promise<void> {
    const link = await carelinksService.createInvite(req.user!.userId);
    res.status(201).json({ careLink: link });
  },

  /**
   * POST /api/carelinks/accept
   */
  async acceptInvite(req: Request, res: Response): Promise<void> {
    const link = await carelinksService.acceptInvite(req.user!.userId, req.body.inviteCode);
    res.status(200).json({ careLink: link });
  },

  /**
   * GET /api/carelinks/me
   */
  async getMyLinks(req: Request, res: Response): Promise<void> {
    const links = await carelinksService.getMyLinks(req.user!.userId);
    res.status(200).json({ careLinks: links, count: links.length });
  },

  /**
   * PATCH /api/carelinks/:id/permissions
   */
  async updatePermissions(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const link = await carelinksService.updatePermissions(
      id,
      req.user!.userId,
      req.body.permissions,
    );
    res.status(200).json({ careLink: link });
  },

  /**
   * PATCH /api/carelinks/:id/revoke
   */
  async revoke(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const link = await carelinksService.revoke(id, req.user!.userId);
    res.status(200).json({ careLink: link });
  },
};
