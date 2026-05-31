/**
 * Spaced Retrieval repository — Prisma queries for SR items and orientation settings.
 */
import { prisma } from '../../../shared/db/prisma.js';

export class SpacedRetrievalRepo {
  async listByPatient(patientId: string, activeOnly = true) {
    return prisma.spacedRetrievalItem.findMany({
      where: {
        patientId,
        ...(activeOnly ? { active: true, archivedAt: null } : {}),
      },
      orderBy: [{ masteryStatus: 'asc' }, { nextDueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        imageAsset: true,
        clueImageAsset: true,
      },
    });
  }

  async findById(itemId: string) {
    return prisma.spacedRetrievalItem.findUnique({
      where: { id: itemId },
      include: {
        imageAsset: true,
        clueImageAsset: true,
      },
    });
  }

  async create(data: {
    patientId: string;
    createdByUserId: string;
    prompt: string;
    correctAnswer: string;
    acceptableAnswers?: any;
    distractors?: any;
    cueText?: string;
    category?: string;
    linkedContactId?: string;
    imageAssetId?: string;
    clueImageAssetId?: string;
    supportRole?: string;
    sensitive?: boolean;
    patientVisible?: boolean;
    supportLevelOverride?: string;
  }) {
    return prisma.spacedRetrievalItem.create({
      data: {
        patientId: data.patientId,
        createdByUserId: data.createdByUserId,
        prompt: data.prompt,
        correctAnswer: data.correctAnswer,
        acceptableAnswers: data.acceptableAnswers ?? [],
        distractors: data.distractors ?? [],
        cueText: data.cueText ?? null,
        category: data.category as any,
        linkedContactId: data.linkedContactId ?? null,
        imageAssetId: data.imageAssetId ?? null,
        clueImageAssetId: data.clueImageAssetId ?? null,
        supportRole: data.supportRole ?? null,
        sensitive: data.sensitive ?? false,
        patientVisible: data.patientVisible ?? true,
        supportLevelOverride: data.supportLevelOverride ?? null,
      },
      include: {
        imageAsset: true,
        clueImageAsset: true,
      },
    });
  }

  async update(itemId: string, data: Partial<{
    prompt: string;
    correctAnswer: string;
    acceptableAnswers: any;
    distractors: any;
    cueText: string;
    category: string;
    active: boolean;
    masteryStatus: string;
    currentIntervalStep: number;
    nextDueAt: Date;
    consecutiveCorrect: number;
    consecutiveIncorrect: number;
    totalAttempts: number;
    correctAttempts: number;
    correctWithoutCue: number;
    correctWithCue: number;
    unsureAttempts: number;
    incorrectAttempts: number;
    lastPracticedAt: Date;
    archivedAt: Date | null;
    linkedContactId: string | null;
    imageAssetId: string | null;
    clueImageAssetId: string | null;
    supportRole: string | null;
    sensitive: boolean;
    patientVisible: boolean;
    supportLevelOverride: string | null;
  }>) {
    const updateData: any = { ...data };
    if (data.category) updateData.category = data.category as any;
    if (data.masteryStatus) updateData.masteryStatus = data.masteryStatus as any;
    return prisma.spacedRetrievalItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        imageAsset: true,
        clueImageAsset: true,
      },
    });
  }

  async archive(itemId: string) {
    return prisma.spacedRetrievalItem.update({
      where: { id: itemId },
      data: { active: false, archivedAt: new Date() },
      include: {
        imageAsset: true,
        clueImageAsset: true,
      },
    });
  }

  async getMasteryCounts(patientId: string) {
    const results = await prisma.spacedRetrievalItem.groupBy({
      by: ['masteryStatus'],
      where: { patientId, active: true, archivedAt: null },
      _count: { id: true },
    });
    return results;
  }

  async getSettings(patientId: string) {
    let settings = await prisma.personalOrientationSettings.findUnique({
      where: { patientId },
    });
    if (!settings) {
      settings = await prisma.personalOrientationSettings.create({
        data: {
          patientId,
          supportLevel: 'GUIDED_SUPPORT',
          weeklyTargetSessions: 5,
          enabledFamilies: ['ORIENTATION_DATE', 'ORIENTATION_PLACE', 'CAREGIVER', 'DAILY_ROUTINE', 'APP_NAVIGATION', 'SAFETY_SUPPORT', 'PEOPLE_RECOGNITION', 'SUPPORT_FACT'],
          includePeopleWithoutPhotos: false,
          includeSensitiveContacts: false,
          maxQuestionsPerSession: 6,
          cueStyle: 'button',
          allowMaintenanceItems: true,
          memoryMatchLevel: 1,
        },
      });
    }
    return settings;
  }

  async upsertSettings(patientId: string, updatedByUserId: string, data: any) {
    const updateData: any = { ...data, updatedByUserId };
    return prisma.personalOrientationSettings.upsert({
      where: { patientId },
      update: updateData,
      create: {
        patientId,
        updatedByUserId,
        supportLevel: data.supportLevel ?? 'GUIDED_SUPPORT',
        weeklyTargetSessions: data.weeklyTargetSessions ?? 5,
        enabledFamilies: data.enabledFamilies ?? ['ORIENTATION_DATE', 'ORIENTATION_PLACE', 'CAREGIVER', 'DAILY_ROUTINE', 'APP_NAVIGATION', 'SAFETY_SUPPORT', 'PEOPLE_RECOGNITION', 'SUPPORT_FACT'],
        includePeopleWithoutPhotos: data.includePeopleWithoutPhotos ?? false,
        includeSensitiveContacts: data.includeSensitiveContacts ?? false,
        maxQuestionsPerSession: data.maxQuestionsPerSession ?? 6,
        cueStyle: data.cueStyle ?? 'button',
        allowMaintenanceItems: data.allowMaintenanceItems ?? true,
        memoryMatchLevel: data.memoryMatchLevel ?? 1,
      },
    });
  }

  // ─── Memory Match Level Persistence ────────────────────────────────────────

  async getMemoryMatchLevel(patientId: string): Promise<number> {
    const settings = await prisma.personalOrientationSettings.findUnique({
      where: { patientId },
      select: { memoryMatchLevel: true },
    });
    return settings?.memoryMatchLevel ?? 1;
  }

  async setMemoryMatchLevel(patientId: string, level: number): Promise<void> {
    await prisma.personalOrientationSettings.upsert({
      where: { patientId },
      update: { memoryMatchLevel: level },
      create: {
        patientId,
        memoryMatchLevel: level,
        supportLevel: 'GUIDED_SUPPORT',
        weeklyTargetSessions: 5,
        enabledFamilies: [],
        includePeopleWithoutPhotos: false,
        includeSensitiveContacts: false,
        maxQuestionsPerSession: 6,
        cueStyle: 'button',
        allowMaintenanceItems: true,
      },
    });
  }

  // ─── Game Contacts ──────────────────────────────────────────────────────────

  async getGameContacts(patientId: string, opts: { includeWithoutPhotos: boolean; includeSensitive: boolean }) {
    return prisma.patientContact.findMany({
      where: {
        patientUserId: patientId,
        memos: {
          some: {
            includeInGame: true,
            ...(opts.includeSensitive ? {} : { isSensitive: false }),
          },
        },
      },
      include: {
        memos: {
          include: {
            photoAsset: true,
          },
        },
      },
    });
  }
}

export const srRepo = new SpacedRetrievalRepo();
