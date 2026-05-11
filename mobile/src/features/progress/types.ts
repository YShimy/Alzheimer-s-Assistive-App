export interface StreakData {
  current: number;
  best: number;
  lastActiveDate: string | null;
}

// ─── Priority Breakdown Types ──────────────────────────────

export interface PriorityBreakdownItem {
  priority: 'normal' | 'high' | 'critical';
  scheduledCount: number;
  doneCount: number;
  snoozeCount: number;
  skipCount: number;
  completionRate: number;
  escalationCount: number;
  trendDelta: number | null;
}

export interface ProgressPriorityBreakdownResponse {
  periodDays: number;
  priorityBreakdown: PriorityBreakdownItem[];
  highAdherenceSummary: string;
  criticalAdherenceSummary: string;
}

// ─── Escalation Alert Types ─────────────────────────────────

export interface EscalationAlert {
  id: string;
  reminderId: string;
  patientUserId: string;
  eventType: string;
  timestamp: string;
  escalationReason: string | null;
  reminderTitle?: string;
  priority?: string;
}

export interface EscalationsResponse {
  escalations: EscalationAlert[];
  count: number;
}


export interface ProgressOverviewResponse {
  summary: {
    currentReminderStreak: number;
    bestReminderStreak: number;
    currentGameStreak: number;
    bestGameStreak: number;
    currentChecklistStreak: number;
    bestChecklistStreak: number;
    generalEngagementStreak: number;
    activeDaysThisWeek: number;
  };
  comparison: {
    reminderConsistencyDelta: number;
    checklistConsistencyDelta: number;
    gameScoreDeltaVsPrevious: number;
  };
}

export interface ChartSeriesData {
  date: string;
  completionRate?: number;
  actedCount?: number;
  scheduledCount?: number;
  completedRuns?: number;
  startedRuns?: number;
  score?: number;
  highestTier?: number;
}

export interface ProgressChartsResponse {
  reminderSeries: ChartSeriesData[];
  checklistSeries: ChartSeriesData[];
  gameScoreSeries: ChartSeriesData[];
  gameTierSeries: ChartSeriesData[];
  // New game-specific series
  memoryMatchScoreSeries: ChartSeriesData[];
  memoryMatchLevelSeries: ChartSeriesData[];
  spacedRetrievalScoreSeries: ChartSeriesData[];
  spacedRetrievalAccuracySeries: ChartSeriesData[];
}

export interface CategoryMetric {
  category: string;
  completionRate: number;
  actedCount?: number;
  scheduledCount?: number;
  completedRuns?: number;
  startedRuns?: number;
}

export interface ProgressCategoriesResponse {
  reminderCategories: CategoryMetric[];
  checklistCategories: CategoryMetric[];
}

export interface ProgressStreaksResponse {
  reminders: StreakData;
  checklists: StreakData;
  games: StreakData;
  general: StreakData;
}

export interface ChecklistRunDetail {
  id: string;
  templateId: string;
  templateTitle: string;
  category: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  completedSteps: number;
  totalSteps: number;
}

export interface ChecklistPeriodStats {
  period: string;
  startDate: string;
  endDate: string;
  totalRuns: number;
  completedRuns: number;
  completionRate: number;
  runs: ChecklistRunDetail[];
}

export interface ProgressChecklistTrackingResponse {
  thisWeek: ChecklistPeriodStats;
  lastWeek: ChecklistPeriodStats;
  thisMonth: ChecklistPeriodStats;
  lastMonth: ChecklistPeriodStats;
}

export interface WeeklyProgressResponse {
  weekStart: string;
  weekEnd: string;
  remindersCompleted: number;
  remindersScheduled: number;
  checklistsCompleted: number;
  checklistsStarted: number;
  gamesPlayed: number;
  averageGameScore: number;
}

// ─── Game Progress Types ───────────────────────────────────

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
