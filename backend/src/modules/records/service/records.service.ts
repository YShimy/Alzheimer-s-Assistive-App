import { randomUUID } from 'crypto';
import { prisma } from '../../../shared/db/prisma.js';
import { getSupabaseAdmin } from '../../../shared/supabase/supabase.client.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';

const PATIENT_RECORDS_BUCKET = process.env.SUPABASE_PATIENT_RECORDS_BUCKET ?? 'patient-records';

export const recordsService = {
  async uploadDocument(
    patientId: string,
    caregiverId: string,
    file: Express.Multer.File,
    metadata: {
      title: string;
      category: any;
      documentDate?: Date;
      sourceName?: string;
      notes?: string;
    }
  ) {
    // 1. Generate ID for storage path
    const documentId = randomUUID();
    
    // 2. Upload to Supabase Storage
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `patients/${patientId}/documents/${documentId}/${safeFileName}`;

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(PATIENT_RECORDS_BUCKET)
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[recordsService] Supabase upload error:', uploadError);
      throw new AppError('Failed to upload document file', 500, ErrorCode.INTERNAL_ERROR);
    }

    // 3. Save to database
    const document = await prisma.patientDocument.create({
      data: {
        id: documentId,
        patientId,
        uploadedByUserId: caregiverId,
        title: metadata.title,
        category: metadata.category,
        documentDate: metadata.documentDate,
        sourceName: metadata.sourceName,
        notes: metadata.notes,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        storageProvider: 'supabase',
        storageBucket: PATIENT_RECORDS_BUCKET,
        storageKey,
        status: 'ACTIVE',
      },
    });

    // 4. Log event (optional/fire-and-forget)
    await prisma.analyticsEvent.create({
      data: {
        eventName: 'document_uploaded',
        patientUserId: patientId,
        actorUserId: caregiverId,
        actorRole: 'caregiver',
        payload: {
          documentId,
          category: metadata.category,
        },
      },
    }).catch(e => console.error('Failed to log document_uploaded event', e));

    return document;
  },

  async listDocuments(patientId: string, filters: { category?: any; includeArchived?: boolean } = {}) {
    return prisma.patientDocument.findMany({
      where: {
        patientId,
        status: filters.includeArchived ? undefined : 'ACTIVE',
        category: filters.category,
      },
      orderBy: [
        { documentDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  },

  async getDocument(patientId: string, documentId: string) {
    const doc = await prisma.patientDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.patientId !== patientId) {
      throw AppError.notFound('Patient record not found');
    }

    return doc;
  },

  async getViewUrl(patientId: string, documentId: string) {
    const doc = await this.getDocument(patientId, documentId);

    const supabase = getSupabaseAdmin();
    const expiresInSeconds = 300; // 5 minutes

    const { data, error } = await supabase.storage
      .from(doc.storageBucket)
      .createSignedUrl(doc.storageKey, expiresInSeconds);

    if (error || !data) {
      console.error('[recordsService] Supabase signed URL error:', error);
      throw new AppError('Failed to generate view URL', 500, ErrorCode.INTERNAL_ERROR);
    }

    // Log view event
    await prisma.analyticsEvent.create({
      data: {
        eventName: 'document_viewed',
        patientUserId: patientId,
        actorUserId: 'system', // Caregiver ID should be passed in ideal scenario, but omitted here for simplicity
        payload: { documentId },
      },
    }).catch(e => console.error('Failed to log document_viewed event', e));

    return {
      url: data.signedUrl,
      expiresInSeconds,
    };
  },

  async updateDocument(
    patientId: string,
    documentId: string,
    updates: {
      title?: string;
      category?: any;
      documentDate?: Date;
      sourceName?: string;
      notes?: string;
    }
  ) {
    const doc = await this.getDocument(patientId, documentId);

    const updated = await prisma.patientDocument.update({
      where: { id: doc.id },
      data: {
        title: updates.title,
        category: updates.category,
        documentDate: updates.documentDate,
        sourceName: updates.sourceName,
        notes: updates.notes,
      },
    });

    return updated;
  },

  async archiveDocument(patientId: string, documentId: string, caregiverId: string) {
    const doc = await this.getDocument(patientId, documentId);

    const updated = await prisma.patientDocument.update({
      where: { id: doc.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await prisma.analyticsEvent.create({
      data: {
        eventName: 'document_archived',
        patientUserId: patientId,
        actorUserId: caregiverId,
        actorRole: 'caregiver',
        payload: { documentId },
      },
    }).catch(e => console.error('Failed to log document_archived event', e));

    return updated;
  },
};
