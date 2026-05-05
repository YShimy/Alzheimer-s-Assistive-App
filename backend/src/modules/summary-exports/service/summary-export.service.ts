import { randomUUID } from 'crypto';
import { prisma } from '../../../shared/db/prisma.js';
import { getSupabaseAdmin } from '../../../shared/supabase/supabase.client.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { generateSummaryPdfBuffer } from './pdf.service.js';

const EXPORTS_BUCKET =
  process.env.SUPABASE_PATIENT_EXPORTS_BUCKET ?? 'patient-exports';
const SIGNED_URL_TTL = 600; // 10 minutes

let _bucketEnsured = false;

async function ensureExportsBucket(supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (_bucketEnsured) return;
  const { error } = await supabase.storage.createBucket(EXPORTS_BUCKET, {
    public: false,
    allowedMimeTypes: ['application/pdf'],
    fileSizeLimit: 30 * 1024 * 1024,
  });
  if (error && !error.message.includes('already exists')) {
    console.warn('[summaryExportService] Could not ensure bucket:', error.message);
  }
  _bucketEnsured = true;
}

type RangePreset = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

type CreateExportInput = {
  rangePreset: RangePreset;
  startDate?: string;
  endDate?: string;
  sections?: {
    importantInfo?: boolean;
    reminders?: boolean;
    checklists?: boolean;
    games?: boolean;
    patientRecords?: boolean;
    timeline?: boolean;
  };
};

function computeRange(input: CreateExportInput): { start: Date; end: Date } {
  const now = new Date();
  if (input.rangePreset === 'LAST_7_DAYS') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start, end: now };
  }
  if (input.rangePreset === 'LAST_30_DAYS') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { start, end: now };
  }
  // CUSTOM
  if (!input.startDate || !input.endDate) {
    throw AppError.badRequest('startDate and endDate are required for custom range');
  }
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw AppError.badRequest('Invalid date format');
  }
  if (start > end) {
    throw AppError.badRequest('startDate must be before or equal to endDate');
  }
  const maxDays = 180;
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > maxDays) {
    throw AppError.badRequest(`Custom date range cannot exceed ${maxDays} days`);
  }
  return { start, end };
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

export const summaryExportService = {
  async createExport(patientId: string, caregiverId: string, input: CreateExportInput) {
    const { start, end } = computeRange(input);

    // Resolve user display names
    const [patient, caregiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: patientId }, select: { displayName: true } }),
      prisma.user.findUnique({ where: { id: caregiverId }, select: { displayName: true, email: true } }),
    ]);

    if (!patient) throw AppError.notFound('Patient not found');
    if (!caregiver) throw AppError.notFound('Caregiver not found');

    const sections = {
      importantInfo: input.sections?.importantInfo ?? true,
      reminders: input.sections?.reminders ?? true,
      checklists: input.sections?.checklists ?? true,
      games: input.sections?.games ?? true,
      patientRecords: input.sections?.patientRecords ?? true,
      timeline: input.sections?.timeline ?? true,
    };

    // Generate PDF in memory
    const pdfBuffer = await generateSummaryPdfBuffer({
      patientId,
      caregiverId,
      patientName: patient.displayName,
      caregiverName: caregiver.displayName || caregiver.email,
      rangeStart: start,
      rangeEnd: end,
      sections,
    });

    // Upload to Supabase Storage
    const exportId = randomUUID();
    const storageKey = `patients/${patientId}/exports/${exportId}/summary-${isoDate(start)}-to-${isoDate(end)}.pdf`;

    const supabase = getSupabaseAdmin();
    await ensureExportsBucket(supabase);

    const { error: uploadError } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .upload(storageKey, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[summaryExportService] Upload error:', uploadError);
      throw new AppError('Failed to upload generated PDF', 500, ErrorCode.INTERNAL_ERROR);
    }

    // Persist export record
    const title = `Summary ${isoDate(start)} to ${isoDate(end)}`;
    const exportRecord = await prisma.patientSummaryExport.create({
      data: {
        id: exportId,
        patientId,
        generatedByUserId: caregiverId,
        rangeStart: start,
        rangeEnd: end,
        title,
        status: 'COMPLETED',
        storageProvider: 'supabase',
        storageBucket: EXPORTS_BUCKET,
        storageKey,
        fileSizeBytes: pdfBuffer.length,
        mimeType: 'application/pdf',
        includedSections: sections,
        summaryMetadata: { patientName: patient.displayName },
      },
    });

    // Create signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .createSignedUrl(storageKey, SIGNED_URL_TTL);

    if (signedError || !signedData) {
      throw new AppError('Failed to generate download URL', 500, ErrorCode.INTERNAL_ERROR);
    }

    // Log event (fire-and-forget)
    prisma.analyticsEvent.create({
      data: {
        eventName: 'summary_export_generated',
        patientUserId: patientId,
        actorUserId: caregiverId,
        actorRole: 'caregiver',
        payload: {
          exportId,
          rangeStart: start.toISOString(),
          rangeEnd: end.toISOString(),
          includedSections: sections,
        },
      },
    }).catch(e => console.error('Failed to log summary_export_generated', e));

    return {
      export: exportRecord,
      downloadUrl: signedData.signedUrl,
      expiresInSeconds: SIGNED_URL_TTL,
    };
  },

  async listExports(patientId: string) {
    return prisma.patientSummaryExport.findMany({
      where: { patientId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, patientId: true, generatedByUserId: true,
        rangeStart: true, rangeEnd: true, title: true, status: true,
        fileSizeBytes: true, mimeType: true, includedSections: true,
        createdAt: true, updatedAt: true,
        // Exclude storageKey / storageBucket from list response
      },
    });
  },

  async getExport(patientId: string, exportId: string) {
    const record = await prisma.patientSummaryExport.findUnique({
      where: { id: exportId },
    });
    if (!record || record.patientId !== patientId || record.archivedAt) {
      throw AppError.notFound('Export not found');
    }
    return record;
  },

  async getDownloadUrl(patientId: string, exportId: string, caregiverId: string) {
    const record = await this.getExport(patientId, exportId);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(record.storageBucket)
      .createSignedUrl(record.storageKey, SIGNED_URL_TTL);

    if (error || !data) {
      throw new AppError('Failed to generate download URL', 500, ErrorCode.INTERNAL_ERROR);
    }

    // Log event (fire-and-forget)
    prisma.analyticsEvent.create({
      data: {
        eventName: 'summary_export_downloaded',
        patientUserId: patientId,
        actorUserId: caregiverId,
        actorRole: 'caregiver',
        payload: { exportId },
      },
    }).catch(e => console.error('Failed to log summary_export_downloaded', e));

    return {
      downloadUrl: data.signedUrl,
      expiresInSeconds: SIGNED_URL_TTL,
    };
  },

  async archiveExport(patientId: string, exportId: string, caregiverId: string) {
    const record = await this.getExport(patientId, exportId);

    const updated = await prisma.patientSummaryExport.update({
      where: { id: record.id },
      data: { archivedAt: new Date(), status: 'ARCHIVED' },
    });

    prisma.analyticsEvent.create({
      data: {
        eventName: 'summary_export_archived',
        patientUserId: patientId,
        actorUserId: caregiverId,
        actorRole: 'caregiver',
        payload: { exportId },
      },
    }).catch(e => console.error('Failed to log summary_export_archived', e));

    return updated;
  },
};
