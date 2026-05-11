/**
 * Spaced Retrieval service — business logic for SR items.
 */
import { srRepo } from '../repo/sr.repo.js';
import type { CreateSRItemDto, UpdateSRItemDto, SRItemResponse } from '../../games/types.js';

function toResponse(item: any): SRItemResponse {
  return {
    id: item.id,
    patientId: item.patientId,
    prompt: item.prompt,
    correctAnswer: item.correctAnswer,
    acceptableAnswers: (item.acceptableAnswers as string[]) || [],
    distractors: (item.distractors as string[]) || [],
    cueText: item.cueText,
    category: item.category,
    active: item.active,
    masteryStatus: item.masteryStatus,
    currentIntervalStep: item.currentIntervalStep,
    nextDueAt: item.nextDueAt?.toISOString() ?? null,
    totalAttempts: item.totalAttempts,
    correctAttempts: item.correctAttempts,
    createdAt: item.createdAt.toISOString(),
  };
}

export class SpacedRetrievalService {
  async listItems(patientId: string, activeOnly = true) {
    const items = await srRepo.listByPatient(patientId, activeOnly);
    return items.map(toResponse);
  }

  async createItem(patientId: string, createdByUserId: string, dto: CreateSRItemDto) {
    const item = await srRepo.create({
      patientId,
      createdByUserId,
      prompt: dto.prompt,
      correctAnswer: dto.correctAnswer,
      acceptableAnswers: dto.acceptableAnswers,
      distractors: dto.distractors,
      cueText: dto.cueText,
      category: dto.category,
    });
    return toResponse(item);
  }

  async updateItem(itemId: string, dto: UpdateSRItemDto) {
    const existing = await srRepo.findById(itemId);
    if (!existing) throw new Error('Item not found');

    const item = await srRepo.update(itemId, {
      prompt: dto.prompt,
      correctAnswer: dto.correctAnswer,
      acceptableAnswers: dto.acceptableAnswers,
      distractors: dto.distractors,
      cueText: dto.cueText,
      category: dto.category,
      active: dto.active,
    });
    return toResponse(item);
  }

  async archiveItem(itemId: string) {
    const item = await srRepo.archive(itemId);
    return toResponse(item);
  }

  async getMasteryCounts(patientId: string) {
    return srRepo.getMasteryCounts(patientId);
  }
}

export const srService = new SpacedRetrievalService();
