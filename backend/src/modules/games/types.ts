/**
 * Games module types — Safe Path Memory and future game types.
 */

export interface CreateGameSessionDto {
  gameType: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  score?: number;
  highestTierReached?: number;
  levelsPlayed?: number;
  levelsSucceeded?: number;
  levelsFailed?: number;
  completed?: boolean;
  quitEarly?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
  levelResults?: CreateLevelResultDto[];
}

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

export interface GameProgressSummary {
  gameType: string;
  summary: {
    sessionsPlayed: number;
    bestScore: number;
    latestScore: number;
    averageScore: number;
    highestTierEver: number;
    lastPlayedAt: string | null;
  };
  scoreSeries: Array<{ date: string; score: number }>;
  tierSeries: Array<{ date: string; highestTier: number }>;
  comparison: {
    deltaVsPreviousSession: number;
    deltaVsBest: number;
  };
}
