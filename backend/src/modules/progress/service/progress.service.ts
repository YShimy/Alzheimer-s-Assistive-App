import { prisma } from '../../../shared/db/prisma.js';
import { calculateStreaks, StreakResult } from '../helpers/streak.helper.js';
import { getLocalDayStart, formatLocalDateStr, generateDateRangeStrings, getStartOfDaysAgo } from '../helpers/date.helper.js';
import { gamesService } from '../../games/service/games.service.js';
import type { 
  ProgressOverviewResponse, 
  ProgressStreaksResponse, 
  ProgressCategoriesResponse, 
  ProgressChartsResponse,
  ProgressChecklistTrackingResponse,
  CategoryMetric,
  ChartSeriesData,
  ChecklistRunDetail,
  ChecklistPeriodStats,
  GameProgressSummary
} from './../types.js';

export class ProgressService {

  // --- STREAKS ----------------------------------------------------
  async getStreaks(patientId: string): Promise<ProgressStreaksResponse> {
    const user = await prisma.user.findUnique({ where: { id: patientId }, select: { timezone: true } });
    const tz = user?.timezone || 'UTC';
    const todayStr = formatLocalDateStr(new Date(), tz);

    // 1. Reminders
    const remEvents = await prisma.reminderEvent.findMany({
      where: { 
        patientUserId: patientId, 
        eventType: { in: ['DONE', 'SNOOZED', 'SKIPPED'] }
      },
      select: { timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 2000
    });
    const remDates = remEvents.map(e => formatLocalDateStr(e.timestamp, tz));

    // 2. Checklists
    const chkRuns = await prisma.checklistRun.findMany({
      where: { patientUserId: patientId, status: { in: ['STARTED', 'IN_PROGRESS', 'COMPLETED'] } },
      select: { startedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2000
    });
    const chkDates = chkRuns.map(r => formatLocalDateStr(r.startedAt || r.createdAt, tz));

    // 3. Games
    const gameRuns = await prisma.gameSession.findMany({
      where: { patientUserId: patientId, completed: true },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
      take: 2000
    });
    const gameDates = gameRuns.map(g => formatLocalDateStr(g.startedAt, tz));

    // 4. General (All)
    const allDates = [...remDates, ...chkDates, ...gameDates].sort((a,b) => b.localeCompare(a)); // desc

    return {
      reminders: calculateStreaks(remDates, todayStr),
      checklists: calculateStreaks(chkDates, todayStr),
      games: calculateStreaks(gameDates, todayStr),
      general: calculateStreaks(allDates, todayStr)
    };
  }

  // --- OVERVIEW ---------------------------------------------------
  async getOverview(patientId: string): Promise<ProgressOverviewResponse> {
    // 1. Get streaks
    const streaks = await this.getStreaks(patientId);

    // 2. Active days this week
    const tz = (await prisma.user.findUnique({ where: { id: patientId }, select: { timezone: true } }))?.timezone || 'UTC';
    const startOfWindow = getStartOfDaysAgo(14); // Fetch 14 days ago to calculate deltas

    // Adherence Window Query (Reminders)
    const remEvents = await prisma.reminderEvent.findMany({
      where: { patientUserId: patientId, timestamp: { gte: startOfWindow } },
      select: { timestamp: true, eventType: true }
    });
    
    // Day logic
    const thisWeekStart = getStartOfDaysAgo(7);
    const uniqueActiveDaysThisWeek = new Set<string>();

    let firedThisWeek = 0, doneThisWeek = 0;
    let firedLastWeek = 0, doneLastWeek = 0;

    remEvents.forEach(e => {
      const isThisWeek = e.timestamp >= thisWeekStart;
      const dStr = formatLocalDateStr(e.timestamp, tz);
      if (isThisWeek && ['DONE', 'SNOOZED', 'SKIPPED'].includes(e.eventType)) uniqueActiveDaysThisWeek.add(dStr);

      if (e.eventType === 'FIRED') isThisWeek ? firedThisWeek++ : firedLastWeek++;
      if (e.eventType === 'DONE') isThisWeek ? doneThisWeek++ : doneLastWeek++;
    });

    // Checklists
    const chkRuns = await prisma.checklistRun.findMany({
      where: { patientUserId: patientId, createdAt: { gte: startOfWindow } },
      select: { createdAt: true, status: true }
    });

    let startedThisWeekChk = 0, compThisWeekChk = 0;
    let startedLastWeekChk = 0, compLastWeekChk = 0;

    chkRuns.forEach(r => {
      const isThisWeek = r.createdAt >= thisWeekStart;
      const dStr = formatLocalDateStr(r.createdAt, tz);
      uniqueActiveDaysThisWeek.add(dStr); // adding to general Engagement

      if (isThisWeek) {
        startedThisWeekChk++;
        if (r.status === 'COMPLETED') compThisWeekChk++;
      } else {
        startedLastWeekChk++;
        if (r.status === 'COMPLETED') compLastWeekChk++;
      }
    });

    // Games
    const gameRuns = await prisma.gameSession.findMany({
      where: { patientUserId: patientId, startedAt: { gte: startOfWindow }, completed: true },
      select: { startedAt: true, score: true }
    });
    
    let scoresThisWeek: number[] = [];
    let scoresLastWeek: number[] = [];
    gameRuns.forEach(g => {
      const isThisWeek = g.startedAt >= thisWeekStart;
      uniqueActiveDaysThisWeek.add(formatLocalDateStr(g.startedAt, tz));
      if (g.score != null) {
        isThisWeek ? scoresThisWeek.push(g.score) : scoresLastWeek.push(g.score);
      }
    });

    const remThisWeek = firedThisWeek ? doneThisWeek / firedThisWeek : 0;
    const remLastWeek = firedLastWeek ? doneLastWeek / firedLastWeek : 0;
    const chkThisWeek = startedThisWeekChk ? compThisWeekChk / startedThisWeekChk : 0;
    const chkLastWeek = startedLastWeekChk ? compLastWeekChk / startedLastWeekChk : 0;
    
    const avgScoreThis = scoresThisWeek.length ? scoresThisWeek.reduce((a,b)=>a+b,0)/scoresThisWeek.length : 0;
    const avgScoreLast = scoresLastWeek.length ? scoresLastWeek.reduce((a,b)=>a+b,0)/scoresLastWeek.length : 0;

    return {
      summary: {
        currentReminderStreak: streaks.reminders.current,
        bestReminderStreak: streaks.reminders.best,
        currentChecklistStreak: streaks.checklists.current,
        bestChecklistStreak: streaks.checklists.best,
        currentGameStreak: streaks.games.current,
        bestGameStreak: streaks.games.best,
        generalEngagementStreak: streaks.general.current,
        activeDaysThisWeek: uniqueActiveDaysThisWeek.size
      },
      comparison: {
        reminderConsistencyDelta: remThisWeek - remLastWeek,
        checklistConsistencyDelta: chkThisWeek - chkLastWeek,
        gameScoreDeltaVsPrevious: avgScoreThis - avgScoreLast
      }
    };
  }

  // --- CHARTS -----------------------------------------------------
  async getCharts(patientId: string): Promise<ProgressChartsResponse> {
    const tz = (await prisma.user.findUnique({ where: { id: patientId }, select: { timezone: true } }))?.timezone || 'UTC';
    const dateStrings = generateDateRangeStrings(7, new Date(), tz);
    const startWindow = getStartOfDaysAgo(7, new Date());

    // Grouping
    const remMap = new Map<string, ChartSeriesData>();
    const chkMap = new Map<string, ChartSeriesData>();
    const gameScrMap = new Map<string, ChartSeriesData>();
    const gameTierMap = new Map<string, ChartSeriesData>();
    
    // Game-specific series
    const safePathScrMap = new Map<string, ChartSeriesData>();
    const safePathTierMap = new Map<string, ChartSeriesData>();
    const routineSeqScrMap = new Map<string, ChartSeriesData>();
    const routineSeqAccMap = new Map<string, ChartSeriesData>();

    dateStrings.forEach(d => {
      remMap.set(d, { date: d, actedCount: 0, scheduledCount: 0, completionRate: 0 });
      chkMap.set(d, { date: d, startedRuns: 0, completedRuns: 0, completionRate: 0 });
      gameScrMap.set(d, { date: d, score: 0 });
      gameTierMap.set(d, { date: d, highestTier: 0 });
      safePathScrMap.set(d, { date: d, score: 0 });
      safePathTierMap.set(d, { date: d, highestTier: 0 });
      routineSeqScrMap.set(d, { date: d, score: 0 });
      routineSeqAccMap.set(d, { date: d, completionRate: 0 });
    });

    const [remEvts, chkRuns, gmRuns, safePathRuns, routineSeqRuns] = await Promise.all([
      prisma.reminderEvent.findMany({ where: { patientUserId: patientId, timestamp: { gte: startWindow } }, select: { timestamp: true, eventType: true } }),
      prisma.checklistRun.findMany({ where: { patientUserId: patientId, createdAt: { gte: startWindow } }, select: { createdAt: true, status: true } }),
      prisma.gameSession.findMany({ where: { patientUserId: patientId, startedAt: { gte: startWindow } }, select: { startedAt: true, score: true, highestTierReached: true, gameType: true } }),
      // Safe Path specific
      prisma.gameSession.findMany({ 
        where: { patientUserId: patientId, startedAt: { gte: startWindow }, gameType: 'safe_path_memory' }, 
        select: { startedAt: true, score: true, highestTierReached: true } 
      }),
      // Routine Sequence specific
      prisma.gameSession.findMany({ 
        where: { patientUserId: patientId, startedAt: { gte: startWindow }, gameType: 'routine_sequence' }, 
        select: { startedAt: true, score: true, levelResults: true } 
      }),
    ]);

    remEvts.forEach(e => {
      const dStr = formatLocalDateStr(e.timestamp, tz);
      const b = remMap.get(dStr);
      if (b) {
        if (e.eventType === 'FIRED') b.scheduledCount = (b.scheduledCount||0) + 1;
        if (['DONE', 'SNOOZED', 'SKIPPED'].includes(e.eventType)) b.actedCount = (b.actedCount||0) + 1;
      }
    });

    chkRuns.forEach(r => {
      const dStr = formatLocalDateStr(r.createdAt, tz);
      const b = chkMap.get(dStr);
      if (b) {
        b.startedRuns = (b.startedRuns||0) + 1;
        if (r.status === 'COMPLETED') b.completedRuns = (b.completedRuns||0) + 1;
      }
    });

    // Score is averaged per day, Tier is max
    const scoreAgg = new Map<string, number[]>();
    const safePathScoreAgg = new Map<string, number[]>();
    const safePathTierAgg = new Map<string, number[]>();
    const routineSeqScoreAgg = new Map<string, number[]>();
    const routineSeqAccAgg = new Map<string, number[]>();
    
    gmRuns.forEach(g => {
      const dStr = formatLocalDateStr(g.startedAt, tz);
      const bScr = gameScrMap.get(dStr);
      const bTier = gameTierMap.get(dStr);
      if (bScr && bTier) {
        if (!scoreAgg.has(dStr)) scoreAgg.set(dStr, []);
        if (g.score != null) scoreAgg.get(dStr)!.push(g.score);
        bTier.highestTier = Math.max(bTier.highestTier || 0, g.highestTierReached || 0);
      }
    });
    
    // Safe Path aggregation
    safePathRuns.forEach(g => {
      const dStr = formatLocalDateStr(g.startedAt, tz);
      if (!safePathScoreAgg.has(dStr)) safePathScoreAgg.set(dStr, []);
      if (g.score != null) safePathScoreAgg.get(dStr)!.push(g.score);
      const bTier = safePathTierMap.get(dStr);
      if (bTier) {
        bTier.highestTier = Math.max(bTier.highestTier || 0, g.highestTierReached || 0);
      }
    });
    
    // Routine Sequence aggregation
    routineSeqRuns.forEach(g => {
      const dStr = formatLocalDateStr(g.startedAt, tz);
      if (!routineSeqScoreAgg.has(dStr)) routineSeqScoreAgg.set(dStr, []);
      if (g.score != null) routineSeqScoreAgg.get(dStr)!.push(g.score);
      
      // Calculate accuracy from level results if available
      const levelResults = g.levelResults as any[] || [];
      if (levelResults.length > 0) {
        const accuracies = levelResults.map(lr => (lr.metadata?.accuracy as number) || 0);
        const avgAcc = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
        if (!routineSeqAccAgg.has(dStr)) routineSeqAccAgg.set(dStr, []);
        routineSeqAccAgg.get(dStr)!.push(avgAcc);
      }
    });

    dateStrings.forEach(d => {
      const rm = remMap.get(d)!;
      rm.completionRate = rm.scheduledCount ? (rm.actedCount! / rm.scheduledCount) : 0;
      
      const ch = chkMap.get(d)!;
      ch.completionRate = ch.startedRuns ? (ch.completedRuns! / ch.startedRuns) : 0;

      const sc = gameScrMap.get(d)!;
      const scores = scoreAgg.get(d) || [];
      sc.score = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
      
      // Safe Path series
      const spScr = safePathScrMap.get(d)!;
      const spScores = safePathScoreAgg.get(d) || [];
      spScr.score = spScores.length ? Math.round(spScores.reduce((a,b)=>a+b,0)/spScores.length) : 0;
      
      // Routine Sequence series
      const rsScr = routineSeqScrMap.get(d)!;
      const rsScores = routineSeqScoreAgg.get(d) || [];
      rsScr.score = rsScores.length ? Math.round(rsScores.reduce((a,b)=>a+b,0)/rsScores.length) : 0;
      
      const rsAcc = routineSeqAccMap.get(d)!;
      const rsAccuracies = routineSeqAccAgg.get(d) || [];
      rsAcc.completionRate = rsAccuracies.length ? (rsAccuracies.reduce((a,b)=>a+b,0)/rsAccuracies.length) : 0;
    });

    return {
      reminderSeries: Array.from(remMap.values()),
      checklistSeries: Array.from(chkMap.values()),
      gameScoreSeries: Array.from(gameScrMap.values()),
      gameTierSeries: Array.from(gameTierMap.values()),
      safePathScoreSeries: Array.from(safePathScrMap.values()),
      safePathTierSeries: Array.from(safePathTierMap.values()),
      routineSequenceScoreSeries: Array.from(routineSeqScrMap.values()),
      routineSequenceAccuracySeries: Array.from(routineSeqAccMap.values()),
    };
  }

  // --- CATEGORIES -------------------------------------------------
  async getCategories(patientId: string): Promise<ProgressCategoriesResponse> {
    const startWindow = getStartOfDaysAgo(30); // Use 30 days for meaningful category distributions

    const [remEvents, chkRuns] = await Promise.all([
      prisma.reminderEvent.findMany({
        where: { patientUserId: patientId, timestamp: { gte: startWindow } },
        include: { reminder: { select: { category: true } } }
      }),
      prisma.checklistRun.findMany({
        where: { patientUserId: patientId, createdAt: { gte: startWindow } },
        include: { template: { select: { category: true } } }
      })
    ]);

    const remCatMap = new Map<string, CategoryMetric>();
    const chkCatMap = new Map<string, CategoryMetric>();

    remEvents.forEach(e => {
      const catName = e.reminder?.category || 'GENERAL';
      if (!remCatMap.has(catName)) remCatMap.set(catName, { category: catName.toLowerCase(), completionRate: 0, actedCount: 0, scheduledCount: 0 });
      const metric = remCatMap.get(catName)!;
      // Count all reminder events as scheduled (reminders don't have separate scheduled events like checklists)
      metric.scheduledCount = (metric.scheduledCount||0) + 1;
      if (e.eventType === 'DONE') metric.actedCount = (metric.actedCount||0) + 1;
    });

    remCatMap.forEach(m => m.completionRate = m.scheduledCount ? (m.actedCount! / m.scheduledCount) : 0);

    chkRuns.forEach(r => {
      const catName = r.template?.category || 'GENERAL';
      if (!chkCatMap.has(catName)) chkCatMap.set(catName, { category: catName.toLowerCase(), completionRate: 0, startedRuns: 0, completedRuns: 0 });
      const metric = chkCatMap.get(catName)!;
      metric.startedRuns = (metric.startedRuns||0) + 1;
      if (r.status === 'COMPLETED') metric.completedRuns = (metric.completedRuns||0) + 1;
    });

    chkCatMap.forEach(m => m.completionRate = m.startedRuns ? (m.completedRuns! / m.startedRuns) : 0);

    return {
      reminderCategories: Array.from(remCatMap.values()),
      checklistCategories: Array.from(chkCatMap.values())
    };
  }

  // --- CHECKLIST TRACKING ----------------------------------------
  async getChecklistTracking(patientId: string): Promise<ProgressChecklistTrackingResponse> {
    const tz = (await prisma.user.findUnique({ where: { id: patientId }, select: { timezone: true } }))?.timezone || 'UTC';
    const now = new Date();
    
    // Calculate period boundaries
    const thisWeekStart = getStartOfDaysAgo(7, now);
    const lastWeekStart = getStartOfDaysAgo(14, now);
    const thisMonthStart = getStartOfDaysAgo(30, now);
    const lastMonthStart = getStartOfDaysAgo(60, now);
    
    // Fetch all checklist runs with template details
    const allRuns = await prisma.checklistRun.findMany({
      where: { patientUserId: patientId },
      include: { 
        template: { select: { id: true, title: true, category: true, steps: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const formatRun = (r: any): ChecklistRunDetail => ({
      id: r.id,
      templateId: r.checklistTemplateId,
      templateTitle: r.template?.title || 'Unknown Checklist',
      category: r.template?.category?.toLowerCase() || 'general',
      status: r.status.toLowerCase(),
      startedAt: r.startedAt?.toISOString() || r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() || null,
      completedSteps: (r.stepResults as any[])?.filter((s: any) => s?.completed).length || 0,
      totalSteps: (r.template?.steps as any[])?.length || 0,
    });
    
    const buildPeriodStats = (runs: any[], start: Date, end: Date, label: string): ChecklistPeriodStats => {
      const periodRuns = runs.filter(r => {
        const runDate = r.createdAt;
        return runDate >= start && runDate < end;
      });
      
      const completed = periodRuns.filter(r => r.status === 'COMPLETED');
      
      return {
        period: label,
        startDate: formatLocalDateStr(start, tz),
        endDate: formatLocalDateStr(end, tz),
        totalRuns: periodRuns.length,
        completedRuns: completed.length,
        completionRate: periodRuns.length ? completed.length / periodRuns.length : 0,
        runs: periodRuns.map(formatRun)
      };
    };
    
    return {
      thisWeek: buildPeriodStats(allRuns, thisWeekStart, now, 'week'),
      lastWeek: buildPeriodStats(allRuns, lastWeekStart, thisWeekStart, 'week'),
      thisMonth: buildPeriodStats(allRuns, thisMonthStart, now, 'month'),
      lastMonth: buildPeriodStats(allRuns, lastMonthStart, thisMonthStart, 'month')
    };
  }

  // --- WEEKLY SUMMARY --------------------------------------------
  async getWeekly(patientId: string) {
    const tz = (await prisma.user.findUnique({ where: { id: patientId }, select: { timezone: true } }))?.timezone || 'UTC';
    const now = new Date();
    const weekStart = getStartOfDaysAgo(7, now);
    
    // Reminders completed this week
    const remindersCompleted = await prisma.reminderEvent.count({
      where: {
        patientUserId: patientId,
        eventType: 'DONE',
        timestamp: { gte: weekStart, lte: now }
      }
    });
    
    // Reminders scheduled this week (count all events except DONE as scheduled/expected)
    const remindersScheduled = await prisma.reminderEvent.count({
      where: {
        patientUserId: patientId,
        timestamp: { gte: weekStart, lte: now }
      }
    });
    
    // Checklists completed/started this week
    const checklistRuns = await prisma.checklistRun.findMany({
      where: {
        patientUserId: patientId,
        createdAt: { gte: weekStart, lte: now }
      }
    });
    const checklistsCompleted = checklistRuns.filter(r => r.status === 'COMPLETED').length;
    const checklistsStarted = checklistRuns.length;
    
    // Games played this week
    const games = await prisma.gameSession.findMany({
      where: {
        patientUserId: patientId,
        completed: true,
        startedAt: { gte: weekStart, lte: now }
      }
    });
    const gamesPlayed = games.length;
    const averageGameScore = games.length > 0 
      ? games.reduce((sum, g) => sum + (g.score || 0), 0) / games.length 
      : 0;
    
    return {
      weekStart: formatLocalDateStr(weekStart, tz),
      weekEnd: formatLocalDateStr(now, tz),
      remindersCompleted,
      remindersScheduled,
      checklistsCompleted,
      checklistsStarted,
      gamesPlayed,
      averageGameScore
    };
  }

  // --- GAME PROGRESS --------------------------------------------
  async getGameProgress(patientId: string, gameType: string): Promise<GameProgressSummary> {
    return gamesService.getGameProgress(patientId, gameType);
  }
}

export const progressService = new ProgressService();
