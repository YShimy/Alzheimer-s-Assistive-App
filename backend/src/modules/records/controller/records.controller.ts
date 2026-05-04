import type { Request, Response, NextFunction } from 'express';
import { recordsService } from '../service/records.service.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

export const recordsController = {
  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = p(req.params.patientId);
      const caregiverId = req.user!.userId;
      
      if (!req.file) {
        throw new AppError('No file provided', 400, ErrorCode.VALIDATION_ERROR);
      }
      
      const { title, category, documentDate, sourceName, notes } = req.body as {
        title?: string;
        category?: string;
        documentDate?: string;
        sourceName?: string;
        notes?: string;
      };
      
      if (!title || !category) {
        throw new AppError('Title and category are required', 400, ErrorCode.VALIDATION_ERROR);
      }

      const document = await recordsService.uploadDocument(
        patientId,
        caregiverId,
        req.file,
        {
          title,
          category: category as any,
          documentDate: documentDate ? new Date(documentDate) : undefined,
          sourceName,
          notes,
        }
      );

      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  },

  async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = p(req.params.patientId);
      const { category, includeArchived } = req.query;

      const documents = await recordsService.listDocuments(patientId, {
        category: category as any,
        includeArchived: includeArchived === 'true',
      });

      res.json({ documents });
    } catch (error) {
      next(error);
    }
  },

  async getDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = p(req.params.patientId);
      const documentId = p(req.params.documentId);
      const document = await recordsService.getDocument(patientId, documentId);
      res.json(document);
    } catch (error) {
      next(error);
    }
  },

  async getViewUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = p(req.params.patientId);
      const documentId = p(req.params.documentId);
      const viewData = await recordsService.getViewUrl(patientId, documentId);
      res.json(viewData);
    } catch (error) {
      next(error);
    }
  },

  async updateDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = p(req.params.patientId);
      const documentId = p(req.params.documentId);
      const { title, category, documentDate, sourceName, notes } = req.body as {
        title?: string;
        category?: string;
        documentDate?: string;
        sourceName?: string;
        notes?: string;
      };

      const document = await recordsService.updateDocument(patientId, documentId, {
        title,
        category: category as any,
        documentDate: documentDate ? new Date(documentDate) : undefined,
        sourceName,
        notes,
      });

      res.json(document);
    } catch (error) {
      next(error);
    }
  },

  async archiveDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = p(req.params.patientId);
      const documentId = p(req.params.documentId);
      const caregiverId = req.user!.userId;

      await recordsService.archiveDocument(patientId, documentId, caregiverId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
