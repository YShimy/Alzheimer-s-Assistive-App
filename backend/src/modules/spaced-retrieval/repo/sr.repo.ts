/**
 * Spaced Retrieval repository — Prisma queries for SR items.
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
    });
  }

  async findById(itemId: string) {
    return prisma.spacedRetrievalItem.findUnique({
      where: { id: itemId },
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
    lastPracticedAt: Date;
    archivedAt: Date | null;
  }>) {
    const updateData: any = { ...data };
    if (data.category) updateData.category = data.category as any;
    if (data.masteryStatus) updateData.masteryStatus = data.masteryStatus as any;
    return prisma.spacedRetrievalItem.update({
      where: { id: itemId },
      data: updateData,
    });
  }

  async archive(itemId: string) {
    return prisma.spacedRetrievalItem.update({
      where: { id: itemId },
      data: { active: false, archivedAt: new Date() },
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
}

export const srRepo = new SpacedRetrievalRepo();
