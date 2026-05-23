/**
 * Games API — unified client for Memory Match and Spaced Retrieval.
 */
import { apiClient } from '@/src/infrastructure/api/client';

export const gamesApi = {
  /** List active games */
  listGames: () => apiClient.get<{ games: any[] }>('/games'),

  /** Start a new game session */
  startSession: (body: { gameType: string; patientId?: string; reminderId?: string }) =>
    apiClient.post<{ session: any }>('/games/sessions/start', body),

  /** Complete a Memory Match session */
  completeMemoryMatch: (sessionId: string, body: any) =>
    apiClient.post<{ session: any }>(`/games/sessions/${sessionId}/complete-memory-match`, body),

  /** Complete a Spaced Retrieval session */
  completeSpacedRetrieval: (sessionId: string, body: any) =>
    apiClient.post<{ session: any }>(`/games/sessions/${sessionId}/complete-spaced-retrieval`, body),

  /** List recent sessions */
  listSessions: (params?: { gameType?: string; patientId?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString() : '';
    return apiClient.get<{ sessions: any[] }>(`/games/sessions${qs}`);
  },

  /** Get generic progress for a game type */
  getProgress: (params: { gameType: string; patientId?: string }) => {
    const qs = '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString();
    return apiClient.get<any>(`/games/progress${qs}`);
  },

  /** Memory Match specific progress */
  getMemoryMatchProgress: (params?: { patientId?: string }) => {
    const qs = params?.patientId ? `?patientId=${params.patientId}` : '';
    return apiClient.get<any>(`/games/progress/memory-match${qs}`);
  },

  /** Spaced Retrieval specific progress */
  getSpacedRetrievalProgress: (params?: { patientId?: string }) => {
    const qs = params?.patientId ? `?patientId=${params.patientId}` : '';
    return apiClient.get<any>(`/games/progress/spaced-retrieval${qs}`);
  },
};

export const spacedRetrievalApi = {
  /** List SR items for a patient — now includes imageUrl and clueImageUrl */
  listItems: (patientId: string, activeOnly = true) =>
    apiClient.get<{ items: any[] }>(`/patients/${patientId}/spaced-retrieval/items?activeOnly=${activeOnly}`),

  /** Create an SR item */
  createItem: (patientId: string, body: {
    prompt: string;
    correctAnswer: string;
    acceptableAnswers?: string[];
    distractors?: string[];
    cueText?: string;
    category: string;
    linkedContactId?: string;
    imageAssetId?: string;
    clueImageAssetId?: string;
    supportRole?: string;
    sensitive?: boolean;
    patientVisible?: boolean;
    supportLevelOverride?: string;
  }) =>
    apiClient.post<{ item: any }>(`/patients/${patientId}/spaced-retrieval/items`, body),

  /** Update an SR item */
  updateItem: (patientId: string, itemId: string, body: Partial<{
    prompt: string;
    correctAnswer: string;
    acceptableAnswers: string[];
    distractors: string[];
    cueText: string;
    category: string;
    active: boolean;
    linkedContactId: string | null;
    imageAssetId: string | null;
    clueImageAssetId: string | null;
    supportRole: string | null;
    sensitive: boolean;
    patientVisible: boolean;
    supportLevelOverride: string | null;
  }>) =>
    apiClient.patch<{ item: any }>(`/patients/${patientId}/spaced-retrieval/items/${itemId}`, body),

  /** Archive an SR item */
  archiveItem: (patientId: string, itemId: string) =>
    apiClient.delete<{ item: any }>(`/patients/${patientId}/spaced-retrieval/items/${itemId}`),

  /** Get SR settings */
  getSettings: (patientId: string) =>
    apiClient.get<{ settings: any }>(`/patients/${patientId}/spaced-retrieval/settings`),

  /** Upsert SR settings */
  upsertSettings: (patientId: string, body: any) =>
    apiClient.put<{ settings: any }>(`/patients/${patientId}/spaced-retrieval/settings`, body),

  /** Get game-eligible contacts (for people-recognition questions) */
  getGameContacts: (patientId: string) =>
    apiClient.get<{ contacts: any[] }>(`/patients/${patientId}/spaced-retrieval/game-contacts`),

  /** Get patient's current Memory Match difficulty level */
  getMemoryMatchLevel: (patientId: string) =>
    apiClient.get<{ level: number }>(`/patients/${patientId}/memory-match/level`),

  /** Save patient's current Memory Match difficulty level */
  setMemoryMatchLevel: (patientId: string, level: number) =>
    apiClient.put<{ level: number }>(`/patients/${patientId}/memory-match/level`, { level }),
};
