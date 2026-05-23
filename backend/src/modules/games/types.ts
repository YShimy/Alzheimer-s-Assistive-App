/**
 * Games module types — Associative Memory Match & Spaced Retrieval Orientation.
 *
 * Replaces old Safe Path Memory / Routine Sequence types.
 * Legacy fields preserved in DB for migration safety.
 */

// ─── Game Session DTOs ──────────────────────────────────────────

export interface StartGameSessionDto {
  gameType: 'ASSOCIATIVE_MEMORY_MATCH' | 'SPACED_RETRIEVAL_ORIENTATION';
  patientId?: string;
  reminderId?: string;
}

export interface CreateGameSessionDto {
  gameType: string;
  patientUserId?: string;
  reminderId?: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  score?: number;
  accuracyPercent?: number;
  levelStarted?: number;
  levelCompleted?: number;
  highestLevel?: number;
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  completed?: boolean;
  quitEarly?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
  itemResults?: CreateItemResultDto[];
  // Legacy support
  highestTierReached?: number;
  levelsPlayed?: number;
  levelsSucceeded?: number;
  levelsFailed?: number;
  levelResults?: CreateLevelResultDto[];
}

export interface CreateItemResultDto {
  itemIndex: number;
  prompt?: string;
  correct: boolean;
  firstTryCorrect?: boolean;
  usedCue?: boolean;
  responseTimeMs?: number;
  attempts?: number;
  selectedAnswer?: string;
  correctAnswer?: string;
  metadata?: Record<string, unknown>;
}

/** @deprecated Kept for legacy session compatibility */
export interface CreateLevelResultDto {
  levelIndex: number;
  difficultyTier: number;
  gridRows: number;
  gridCols: number;
  bombCount: number;
  previewDurationMs: number;
  solveTimeMs?: number;
  success: boolean;
  scoreDelta?: number;
  pathLength?: number;
  retryCount?: number;
  startedAt?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

// ─── Game List ──────────────────────────────────────────────────

export interface ActiveGame {
  gameType: string;
  displayName: string;
  patientDisplayName: string;
  description: string;
  recommendedFrequency: string;
  targetSessionsPerWeek: number;
  iconName: string;
}

// ─── Progress ─────────────────────────────────────────────────

export interface GameProgressSummary {
  gameType: string;
  summary: {
    sessionsPlayed: number;
    bestScore: number;
    latestScore: number;
    averageScore: number;
    highestLevelEver: number;
    lastPlayedAt: string | null;
    averageAccuracyPercent: number;
    completedSessions: number;
    abandonedSessions: number;
  };
  scoreSeries: Array<{ date: string; score: number }>;
  accuracySeries: Array<{ date: string; accuracyPercent: number }>;
  levelSeries: Array<{ date: string; highestLevel: number }>;
  comparison: {
    deltaVsPreviousSession: number;
    deltaVsBest: number;
  };
}

// ─── Memory Match Specific ──────────────────────────────────────

export interface MemoryMatchProgress {
  gameType: 'ASSOCIATIVE_MEMORY_MATCH';
  weeklySessionsCompleted: number;
  weeklySessionsTarget: number;
  accuracyTrend: Array<{ date: string; accuracyPercent: number }>;
  levelTrend: Array<{ date: string; level: number }>;
  highestStableLevel: number;
  averageResponseTimeMs: number;
  completionVsTarget: number;
  recentSessions: Array<{
    id: string;
    date: string;
    score: number;
    accuracyPercent: number;
    levelCompleted: number;
    status: string;
  }>;
}

// ─── Spaced Retrieval Specific ──────────────────────────────────

export interface SpacedRetrievalProgress {
  gameType: 'SPACED_RETRIEVAL_ORIENTATION';
  weeklySessionsCompleted: number;
  weeklySessionsTarget: number;
  accuracyTrend: Array<{ date: string; accuracyPercent: number }>;
  cueUseRate: number;
  masteredItemCount: number;
  needsReviewCount: number;
  learningItemCount: number;
  completionVsTarget: number;
  recentSessions: Array<{
    id: string;
    date: string;
    score: number;
    accuracyPercent: number;
    cueUseRate: number;
    status: string;
  }>;
  categoryDistribution: Array<{ category: string; count: number }>;
}

// ─── SR Item DTOs ───────────────────────────────────────────────

export interface CreateSRItemDto {
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
}

export interface UpdateSRItemDto {
  prompt?: string;
  correctAnswer?: string;
  acceptableAnswers?: string[];
  distractors?: string[];
  cueText?: string;
  category?: string;
  active?: boolean;
  linkedContactId?: string | null;
  imageAssetId?: string | null;
  clueImageAssetId?: string | null;
  supportRole?: string | null;
  sensitive?: boolean;
  patientVisible?: boolean;
  supportLevelOverride?: string | null;
}

export interface SRItemResponse {
  id: string;
  patientId: string;
  prompt: string;
  correctAnswer: string;
  acceptableAnswers: string[];
  distractors: string[];
  cueText: string | null;
  category: string;
  active: boolean;
  linkedContactId?: string | null;
  imageAssetId?: string | null;
  clueImageAssetId?: string | null;
  imageUrl?: string | null;
  clueImageUrl?: string | null;
  supportRole?: string | null;
  sensitive?: boolean;
  patientVisible?: boolean;
  supportLevelOverride?: string | null;
  masteryStatus: string;
  currentIntervalStep: number;
  nextDueAt: string | null;
  totalAttempts: number;
  correctAttempts: number;
  createdAt: string;
}
