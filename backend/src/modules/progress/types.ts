export interface StreakData {
  current: number;
  best: number;
  lastActiveDate: string | null;
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
  // Separate game-specific series
  safePathScoreSeries: ChartSeriesData[];
  safePathTierSeries: ChartSeriesData[];
  routineSequenceScoreSeries: ChartSeriesData[];
  routineSequenceAccuracySeries: ChartSeriesData[];
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
