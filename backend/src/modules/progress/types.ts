export interface StreakData {
  current: number;
  best: number;
  lastActiveDate: string | null;
}

// ─── Priority Breakdown Types ──────────────────────────────

export interface PriorityBreakdownItem {
  priority: 'normal' | 'high' | 'critical';
  /** Total reminder events (FIRED or all action events) in period */
  scheduledCount: number;
  /** Events with eventType DONE */
  doneCount: number;
  /** Events with eventType SNOOZED */
  snoozeCount: number;
  /** Events with eventType SKIPPED */
  skipCount: number;
  /** doneCount / scheduledCount — 0 if none scheduled */
  completionRate: number;
  /** How many of the skips triggered an escalation (critical/high only) */
  escalationCount: number;
  /** Completion rate vs previous equivalent period (+/- delta) */
  trendDelta: number | null;
}

export interface ProgressPriorityBreakdownResponse {
  periodDays: number;
  priorityBreakdown: PriorityBreakdownItem[];
  highAdherenceSummary: string;
  criticalAdherenceSummary: string;
}

// Redesigned: Priority-aware metrics
export interface PriorityMetrics {
  completionRate: number;
  total: number;
  completed: number;
  skipped?: number;
}

// Redesigned: Guided task metrics
export interface GuidedTaskMetrics {
  started: number;
  completed: number;
  completionRate: number;
  abandoned: number;
}

// Redesigned: Action breakdown
export interface ActionBreakdown {
  done: number;
  snoozed: number;
  skipped: number;
  startNow: number;
  checklistCompleted: number;
}

// Redesigned: Enhanced comparison deltas
export interface ComparisonDeltas {
  reminderConsistencyDelta: number;
  checklistConsistencyDelta: number;
  gameScoreDeltaVsPrevious: number;
  highPriorityDelta: number;
  guidedTaskCompletionDelta: number;
}

export interface EnhancedReminderMetrics {
  priorityMetrics: {
    normal: PriorityMetrics;
    high: PriorityMetrics;
    critical: PriorityMetrics;
  };
  guidedTaskMetrics: GuidedTaskMetrics;
  actionBreakdown: ActionBreakdown;
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
    // Redesigned: new streaks
    highPriorityStreak: number;
    guidedTaskStreak: number;
  };
  comparison: ComparisonDeltas;
  // Redesigned: detailed metrics
  priorityMetrics?: {
    normal: PriorityMetrics;
    high: PriorityMetrics;
    critical: PriorityMetrics;
  };
  guidedTaskMetrics?: GuidedTaskMetrics;
  actionBreakdown?: ActionBreakdown;
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
  period: string; // 'week' | 'month'
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

export interface ProgressStreaksResponse {
  reminders: StreakData;
  checklists: StreakData;
  games: StreakData;
  general: StreakData;
  // Redesigned: new streak types
  highPriorityReminders: StreakData;
  guidedTasks: StreakData;
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
