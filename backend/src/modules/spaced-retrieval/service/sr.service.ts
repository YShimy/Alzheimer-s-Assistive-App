/**
 * Spaced Retrieval service — business logic for SR items, settings, and game support.
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
    linkedContactId: item.linkedContactId,
    imageAssetId: item.imageAssetId ?? null,
    clueImageAssetId: item.clueImageAssetId ?? null,
    imageUrl: item.imageAsset?.publicUrl ?? null,
    clueImageUrl: item.clueImageAsset?.publicUrl ?? null,
    supportRole: item.supportRole,
    sensitive: item.sensitive,
    patientVisible: item.patientVisible,
    supportLevelOverride: item.supportLevelOverride,
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
      linkedContactId: dto.linkedContactId,
      imageAssetId: dto.imageAssetId,
      clueImageAssetId: dto.clueImageAssetId,
      supportRole: dto.supportRole,
      sensitive: dto.sensitive,
      patientVisible: dto.patientVisible,
      supportLevelOverride: dto.supportLevelOverride,
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
      linkedContactId: dto.linkedContactId,
      imageAssetId: dto.imageAssetId,
      clueImageAssetId: dto.clueImageAssetId,
      supportRole: dto.supportRole,
      sensitive: dto.sensitive,
      patientVisible: dto.patientVisible,
      supportLevelOverride: dto.supportLevelOverride,
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

  async getSettings(patientId: string) {
    return srRepo.getSettings(patientId);
  }

  async upsertSettings(patientId: string, updatedByUserId: string, data: any) {
    return srRepo.upsertSettings(patientId, updatedByUserId, data);
  }

  // ─── Memory Match Level Persistence ──────────────────────────────────────

  async getMemoryMatchLevel(patientId: string): Promise<number> {
    return srRepo.getMemoryMatchLevel(patientId);
  }

  async setMemoryMatchLevel(patientId: string, level: number): Promise<void> {
    const clamped = Math.max(1, Math.min(12, level));
    return srRepo.setMemoryMatchLevel(patientId, clamped);
  }

  // ─── Game Contacts ────────────────────────────────────────────────────────

  async getGameContacts(patientId: string) {
    const settings = await srRepo.getSettings(patientId);
    return srRepo.getGameContacts(patientId, {
      includeWithoutPhotos: settings.includePeopleWithoutPhotos,
      includeSensitive: settings.includeSensitiveContacts,
    });
  }
}

export const srService = new SpacedRetrievalService();
