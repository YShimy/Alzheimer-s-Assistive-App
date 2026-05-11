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
  GameProgressSummary,
  // Redesigned: new progress types
  PriorityMetrics,
  GuidedTaskMetrics,
  ComparisonDeltas,
  EnhancedReminderMetrics,
  PriorityBreakdownItem,
  ProgressPriorityBreakdownResponse,
} from './../types.js';


export class ProgressService {

  // --- STREAKS ----------------------------------------------------
  // Redesigned: Enhanced streaks with priority-aware and guided task tracking
  async getStreaks(patientId: string): Promise<ProgressStreaksResponse> {
    const user = await prisma.user.findUnique({ where: { id: patientId }, select: { timezone: true } });
    const tz = user?.timezone || 'UTC';
    const todayStr = formatLocalDateStr(new Date(), tz);

    // 1. All Reminders
    const remEvents = await prisma.reminderEvent.findMany({
      where: { 
        patientUserId: patientId, 
        // Redesigned: include new action types for guided reminders (cast as any until migration)
        eventType: { in: ['DONE', 'SNOOZED', 'SKIPPED', 'START_NOW', 'LINKED_CHECKLIST_COMPLETED'] as any }
      },
      select: { timestamp: true, eventType: true },
      orderBy: { timestamp: 'desc' },
      take: 2000
    });
    const remDates = remEvents.map(e => formatLocalDateStr(e.timestamp, tz));

    // 2. Priority-specific streaks (high/critical reminders only)
    const highPriorityEvents = await prisma.reminderEvent.findMany({
      where: {
        patientUserId: patientId,
        eventType: { in: ['DONE', 'START_NOW', 'LINKED_CHECKLIST_COMPLETED'] as any },
        // Cast priority filter as any until migration runs
        reminder: { priority: { in: ['HIGH', 'CRITICAL'] as any } }
      },
      select: { timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });
    const highPriorityDates = highPriorityEvents.map(e => formatLocalDateStr(e.timestamp, tz));

    // 3. Guided task streaks (checklist-linked reminders)
    const guidedEvents = await prisma.reminderEvent.findMany({
      where: {
        patientUserId: patientId,
        eventType: { in: ['LINKED_CHECKLIST_COMPLETED'] as any },
      },
      select: { timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });
    const guidedDates = guidedEvents.map(e => formatLocalDateStr(e.timestamp, tz));

    // 4. Checklists
    const chkRuns = await prisma.checklistRun.findMany({
      where: { patientUserId: patientId, status: { in: ['STARTED', 'IN_PROGRESS', 'COMPLETED'] } },
      select: { startedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2000
    });
    const chkDates = chkRuns.map(r => formatLocalDateStr(r.startedAt || r.createdAt, tz));

    // 5. Games
    const gameRuns = await prisma.gameSession.findMany({
      where: { patientUserId: patientId, completed: true },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
      take: 2000
    });
    const gameDates = gameRuns.map(g => formatLocalDateStr(g.startedAt, tz));

    // 6. General (All)
    const allDates = [...remDates, ...chkDates, ...gameDates].sort((a,b) => b.localeCompare(a)); // desc

    return {
      reminders: calculateStreaks(remDates, todayStr),
      checklists: calculateStreaks(chkDates, todayStr),
      games: calculateStreaks(gameDates, todayStr),
      general: calculateStreaks(allDates, todayStr),
      // Redesigned: new streak types
      highPriorityReminders: calculateStreaks(highPriorityDates, todayStr),
      guidedTasks: calculateStreaks(guidedDates, todayStr),
    };
  }

  // --- OVERVIEW ---------------------------------------------------
  // Redesigned: Enhanced overview with priority-aware and guided-task metrics
  async getOverview(patientId: string): Promise<ProgressOverviewResponse> {
    // 1. Get streaks
    const streaks = await this.getStreaks(patientId);

    // 2. Active days this week
    const tz = (await prisma.user.findUnique({ where: { id: patientId }, select: { timezone: true } }))?.timezone || 'UTC';
    const startOfWindow = getStartOfDaysAgo(14); // Fetch 14 days ago to calculate deltas
    const thisWeekStart = getStartOfDaysAgo(7);
    const uniqueActiveDaysThisWeek = new Set<string>();

    // Redesigned: Enhanced reminder queries with priority and type
    const [remEvents, priorityEvents, guidedEvents] = await Promise.all([
      // All reminder events
      prisma.reminderEvent.findMany({
        where: { patientUserId: patientId, timestamp: { gte: startOfWindow } },
        // Cast include as any until migration adds new fields
        include: { reminder: { select: { priority: true, reminderType: true, category: true } as any } }
      }),
      // Priority-aware events (high/critical)
      prisma.reminderEvent.findMany({
        where: { 
          patientUserId: patientId, 
          timestamp: { gte: startOfWindow },
          // Cast eventType filter as any until migration runs
          eventType: { in: ['DONE', 'START_NOW', 'LINKED_CHECKLIST_COMPLETED'] as any },
          reminder: { priority: { in: ['HIGH', 'CRITICAL'] as any } }
        },
        select: { timestamp: true, eventType: true }
      }),
      // Guided task events
      prisma.reminderEvent.findMany({
        where: { 
          patientUserId: patientId, 
          timestamp: { gte: startOfWindow },
          // Cast eventType filter as any until migration runs
          eventType: { in: ['START_NOW', 'LINKED_CHECKLIST_COMPLETED'] as any }
        },
        select: { timestamp: true, eventType: true }
      }),
    ]);

    // Calculate period-based metrics
    let firedThisWeek = 0, doneThisWeek = 0, skippedThisWeek = 0;
    let firedLastWeek = 0, doneLastWeek = 0, skippedLastWeek = 0;
    
    // Priority-specific metrics
    let highDoneThisWeek = 0, highTotalThisWeek = 0;
    let highDoneLastWeek = 0, highTotalLastWeek = 0;
    
    // Guided task metrics
    let guidedStartedThisWeek = 0, guidedCompletedThisWeek = 0;
    let guidedStartedLastWeek = 0, guidedCompletedLastWeek = 0;

    remEvents.forEach(e => {
      const isThisWeek = e.timestamp >= thisWeekStart;
      const dStr = formatLocalDateStr(e.timestamp, tz);
      
      // Track active days
      if (isThisWeek && ['DONE', 'SNOOZED', 'SKIPPED', 'START_NOW', 'LINKED_CHECKLIST_COMPLETED'].includes(e.eventType)) {
        uniqueActiveDaysThisWeek.add(dStr);
      }

      // Track fired/completed
      if (e.eventType === 'FIRED') isThisWeek ? firedThisWeek++ : firedLastWeek++;
      if (e.eventType === 'DONE') isThisWeek ? doneThisWeek++ : doneLastWeek++;
      if (e.eventType === 'SKIPPED') isThisWeek ? skippedThisWeek++ : skippedLastWeek++;
    });

    // Priority metrics
    priorityEvents.forEach(e => {
      const isThisWeek = e.timestamp >= thisWeekStart;
      if (['DONE', 'START_NOW', 'LINKED_CHECKLIST_COMPLETED'].includes(e.eventType)) {
        isThisWeek ? highDoneThisWeek++ : highDoneLastWeek++;
      }
      isThisWeek ? highTotalThisWeek++ : highTotalLastWeek++;
    });

    // Guided task metrics
    guidedEvents.forEach(e => {
      const isThisWeek = e.timestamp >= thisWeekStart;
      // Cast eventType comparison as any until migration runs
      if ((e.eventType as any) === 'START_NOW') isThisWeek ? guidedStartedThisWeek++ : guidedStartedLastWeek++;
      if ((e.eventType as any) === 'LINKED_CHECKLIST_COMPLETED') isThisWeek ? guidedCompletedThisWeek++ : guidedCompletedLastWeek++;
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
      uniqueActiveDaysThisWeek.add(dStr);

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

    // Calculate rates
    const remThisWeek = firedThisWeek ? doneThisWeek / firedThisWeek : 0;
    const remLastWeek = firedLastWeek ? doneLastWeek / firedLastWeek : 0;
    const chkThisWeek = startedThisWeekChk ? compThisWeekChk / startedThisWeekChk : 0;
    const chkLastWeek = startedLastWeekChk ? compLastWeekChk / startedLastWeekChk : 0;
    
    const avgScoreThis = scoresThisWeek.length ? scoresThisWeek.reduce((a,b)=>a+b,0)/scoresThisWeek.length : 0;
    const avgScoreLast = scoresLastWeek.length ? scoresLastWeek.reduce((a,b)=>a+b,0)/scoresLastWeek.length : 0;

    // Redesigned: Priority and guided metrics
    const highPriorityThisWeek = highTotalThisWeek ? highDoneThisWeek / highTotalThisWeek : 0;
    const highPriorityLastWeek = highTotalLastWeek ? highDoneLastWeek / highTotalLastWeek : 0;
    
    const guidedCompletionThisWeek = guidedStartedThisWeek ? guidedCompletedThisWeek / guidedStartedThisWeek : 0;
    const guidedCompletionLastWeek = guidedStartedLastWeek ? guidedCompletedLastWeek / guidedStartedLastWeek : 0;

    return {
      summary: {
        currentReminderStreak: streaks.reminders.current,
        bestReminderStreak: streaks.reminders.best,
        currentChecklistStreak: streaks.checklists.current,
        bestChecklistStreak: streaks.checklists.best,
        currentGameStreak: streaks.games.current,
        bestGameStreak: streaks.games.best,
        generalEngagementStreak: streaks.general.current,
        activeDaysThisWeek: uniqueActiveDaysThisWeek.size,
        // Redesigned: new streaks
        highPriorityStreak: streaks.highPriorityReminders?.current || 0,
        guidedTaskStreak: streaks.guidedTasks?.current || 0,
      },
      comparison: {
        reminderConsistencyDelta: remThisWeek - remLastWeek,
        checklistConsistencyDelta: chkThisWeek - chkLastWeek,
        gameScoreDeltaVsPrevious: avgScoreThis - avgScoreLast,
        // Redesigned: new comparison deltas
        highPriorityDelta: highPriorityThisWeek - highPriorityLastWeek,
        guidedTaskCompletionDelta: guidedCompletionThisWeek - guidedCompletionLastWeek,
      },
      // Redesigned: detailed metrics
      priorityMetrics: {
        normal: { completionRate: 0, total: 0, completed: 0 }, // Calculated below if needed
        high: { 
          completionRate: highPriorityThisWeek, 
          total: highTotalThisWeek, 
          completed: highDoneThisWeek,
          skipped: skippedThisWeek 
        },
        critical: { completionRate: 0, total: 0, completed: 0 }, // Will be calculated separately
      },
      guidedTaskMetrics: {
        started: guidedStartedThisWeek,
        completed: guidedCompletedThisWeek,
        completionRate: guidedCompletionThisWeek,
        abandoned: guidedStartedThisWeek - guidedCompletedThisWeek,
      },
      // Redesigned: action-aware metrics
      actionBreakdown: {
        done: doneThisWeek,
        snoozed: 0, // Would need separate query
        skipped: skippedThisWeek,
        startNow: guidedStartedThisWeek,
        checklistCompleted: guidedCompletedThisWeek,
      },
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
    
    // New game-specific series
    const memoryMatchScrMap = new Map<string, ChartSeriesData>();
    const memoryMatchLvlMap = new Map<string, ChartSeriesData>();
    const spacedRetrievalScrMap = new Map<string, ChartSeriesData>();
    const spacedRetrievalAccMap = new Map<string, ChartSeriesData>();

    dateStrings.forEach(d => {
      remMap.set(d, { date: d, actedCount: 0, scheduledCount: 0, completionRate: 0 });
      chkMap.set(d, { date: d, startedRuns: 0, completedRuns: 0, completionRate: 0 });
      gameScrMap.set(d, { date: d, score: 0 });
      gameTierMap.set(d, { date: d, highestTier: 0 });
      memoryMatchScrMap.set(d, { date: d, score: 0 });
      memoryMatchLvlMap.set(d, { date: d, highestTier: 0 });
      spacedRetrievalScrMap.set(d, { date: d, score: 0 });
      spacedRetrievalAccMap.set(d, { date: d, completionRate: 0 });
    });

    const [remEvts, chkRuns, gmRuns, memoryMatchRuns, spacedRetrievalRuns] = await Promise.all([
      prisma.reminderEvent.findMany({ where: { patientUserId: patientId, timestamp: { gte: startWindow } }, select: { timestamp: true, eventType: true } }),
      prisma.checklistRun.findMany({ where: { patientUserId: patientId, createdAt: { gte: startWindow } }, select: { createdAt: true, status: true } }),
      prisma.gameSession.findMany({ where: { patientUserId: patientId, startedAt: { gte: startWindow } }, select: { startedAt: true, score: true, highestTierReached: true, gameType: true } }),
      // Memory Match specific
      prisma.gameSession.findMany({ 
        where: { patientUserId: patientId, startedAt: { gte: startWindow }, gameType: 'ASSOCIATIVE_MEMORY_MATCH' }, 
        select: { startedAt: true, score: true, highestLevel: true, accuracyPercent: true } 
      }),
      // Spaced Retrieval specific
      prisma.gameSession.findMany({ 
        where: { patientUserId: patientId, startedAt: { gte: startWindow }, gameType: 'SPACED_RETRIEVAL_ORIENTATION' }, 
        select: { startedAt: true, score: true, accuracyPercent: true } 
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
    const memoryMatchScoreAgg = new Map<string, number[]>();
    const memoryMatchLevelAgg = new Map<string, number[]>();
    const spacedRetrievalScoreAgg = new Map<string, number[]>();
    const spacedRetrievalAccAgg = new Map<string, number[]>();
    
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
    
    // Memory Match aggregation
    memoryMatchRuns.forEach(g => {
      const dStr = formatLocalDateStr(g.startedAt, tz);
      if (!memoryMatchScoreAgg.has(dStr)) memoryMatchScoreAgg.set(dStr, []);
      if (g.score != null) memoryMatchScoreAgg.get(dStr)!.push(g.score);
      const bLvl = memoryMatchLvlMap.get(dStr);
      if (bLvl) {
        bLvl.highestTier = Math.max(bLvl.highestTier || 0, g.highestLevel || 0);
      }
    });
    
    // Spaced Retrieval aggregation
    spacedRetrievalRuns.forEach(g => {
      const dStr = formatLocalDateStr(g.startedAt, tz);
      if (!spacedRetrievalScoreAgg.has(dStr)) spacedRetrievalScoreAgg.set(dStr, []);
      if (g.score != null) spacedRetrievalScoreAgg.get(dStr)!.push(g.score);
      if (g.accuracyPercent != null) {
        if (!spacedRetrievalAccAgg.has(dStr)) spacedRetrievalAccAgg.set(dStr, []);
        spacedRetrievalAccAgg.get(dStr)!.push(g.accuracyPercent);
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
      
      // Memory Match series
      const mmScr = memoryMatchScrMap.get(d)!;
      const mmScores = memoryMatchScoreAgg.get(d) || [];
      mmScr.score = mmScores.length ? Math.round(mmScores.reduce((a,b)=>a+b,0)/mmScores.length) : 0;
      
      const mmLvl = memoryMatchLvlMap.get(d)!;
      const mmLevels = memoryMatchLevelAgg.get(d) || [];
      mmLvl.highestTier = mmLevels.length ? Math.round(mmLevels.reduce((a,b)=>a+b,0)/mmLevels.length) : 0;
      
      // Spaced Retrieval series
      const srScr = spacedRetrievalScrMap.get(d)!;
      const srScores = spacedRetrievalScoreAgg.get(d) || [];
      srScr.score = srScores.length ? Math.round(srScores.reduce((a,b)=>a+b,0)/srScores.length) : 0;
      
      const srAcc = spacedRetrievalAccMap.get(d)!;
      const srAccuracies = spacedRetrievalAccAgg.get(d) || [];
      srAcc.completionRate = srAccuracies.length ? (srAccuracies.reduce((a,b)=>a+b,0)/srAccuracies.length) : 0;
    });

    return {
      reminderSeries: Array.from(remMap.values()),
      checklistSeries: Array.from(chkMap.values()),
      gameScoreSeries: Array.from(gameScrMap.values()),
      gameTierSeries: Array.from(gameTierMap.values()),
      memoryMatchScoreSeries: Array.from(memoryMatchScrMap.values()),
      memoryMatchLevelSeries: Array.from(memoryMatchLvlMap.values()),
      spacedRetrievalScoreSeries: Array.from(spacedRetrievalScrMap.values()),
      spacedRetrievalAccuracySeries: Array.from(spacedRetrievalAccMap.values()),
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

  // --- PRIORITY BREAKDOWN ----------------------------------------
  /**
   * Compute detailed per-priority reminder adherence metrics.
   *
   * For each priority level (NORMAL, HIGH, CRITICAL):
   *   - scheduledCount: total reminder action events in period
   *   - doneCount / snoozeCount / skipCount: split by action
   *   - completionRate: done / scheduled (0 if no data)
   *   - escalationCount: events where escalationTriggered = true
   *   - trendDelta: completionRate vs previous equivalent period
   */
  async getPriorityBreakdown(
    patientId: string,
    periodDays = 7,
  ): Promise<ProgressPriorityBreakdownResponse> {
    const now = new Date();
    const periodStart = getStartOfDaysAgo(periodDays, now);
    const prevPeriodStart = getStartOfDaysAgo(periodDays * 2, now);

    // Fetch current period events with priority from reminder relation
    const [currentEvents, prevEvents] = await Promise.all([
      prisma.reminderEvent.findMany({
        where: {
          patientUserId: patientId,
          timestamp: { gte: periodStart, lt: now },
          eventType: { in: ['DONE', 'SNOOZED', 'SKIPPED'] },
        },
        include: {
          reminder: { select: { priority: true } },
        },
      }),
      prisma.reminderEvent.findMany({
        where: {
          patientUserId: patientId,
          timestamp: { gte: prevPeriodStart, lt: periodStart },
          eventType: { in: ['DONE', 'SNOOZED', 'SKIPPED'] },
        },
        include: {
          reminder: { select: { priority: true } },
        },
      }),
    ]);

    // Fetch escalation events in current period
    const escalationEvents = await prisma.reminderEvent.findMany({
      where: {
        patientUserId: patientId,
        timestamp: { gte: periodStart, lt: now },
        escalationTriggered: true,
      },
      include: {
        reminder: { select: { priority: true } },
      },
    });

    // Helper: build a bucket for a given priority
    type Bucket = {
      scheduled: number;
      done: number;
      snoozed: number;
      skipped: number;
    };

    const emptyBucket = (): Bucket => ({
      scheduled: 0,
      done: 0,
      snoozed: 0,
      skipped: 0,
    });

    const priorityKeys = ['NORMAL', 'HIGH', 'CRITICAL'] as const;

    function buildBuckets(events: typeof currentEvents): Record<string, Bucket> {
      const buckets: Record<string, Bucket> = {
        NORMAL: emptyBucket(),
        HIGH: emptyBucket(),
        CRITICAL: emptyBucket(),
      };

      for (const e of events) {
        const prio = (e.reminder?.priority ?? 'NORMAL') as string;
        if (!buckets[prio]) continue;
        const b = buckets[prio]!;
        b.scheduled++;
        if (e.eventType === 'DONE') b.done++;
        else if (e.eventType === 'SNOOZED') b.snoozed++;
        else if (e.eventType === 'SKIPPED') b.skipped++;
      }
      return buckets;
    }

    const current = buildBuckets(currentEvents);
    const prev = buildBuckets(prevEvents);

    // Escalation counts per priority
    const escalationByPriority: Record<string, number> = {
      NORMAL: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const e of escalationEvents) {
      const prio = (e.reminder?.priority ?? 'NORMAL') as string;
      if (escalationByPriority[prio] !== undefined) {
        escalationByPriority[prio]!++;
      }
    }

    const priorityBreakdown: PriorityBreakdownItem[] = priorityKeys.map((pKey) => {
      const cur = current[pKey] ?? emptyBucket();
      const prv = prev[pKey] ?? emptyBucket();

      const completionRate = cur.scheduled > 0 ? cur.done / cur.scheduled : 0;
      const prevCompletionRate = prv.scheduled > 0 ? prv.done / prv.scheduled : 0;
      const trendDelta = prv.scheduled > 0 ? completionRate - prevCompletionRate : null;

      return {
        priority: pKey.toLowerCase() as 'normal' | 'high' | 'critical',
        scheduledCount: cur.scheduled,
        doneCount: cur.done,
        snoozeCount: cur.snoozed,
        skipCount: cur.skipped,
        completionRate: Math.round(completionRate * 1000) / 1000,
        escalationCount: escalationByPriority[pKey] ?? 0,
        trendDelta: trendDelta !== null ? Math.round(trendDelta * 1000) / 1000 : null,
      };
    });

    // Build human-readable summaries
    const highItem = priorityBreakdown.find((p) => p.priority === 'high')!;
    const critItem = priorityBreakdown.find((p) => p.priority === 'critical')!;

    const pct = (r: number) => `${Math.round(r * 100)}%`;

    const highAdherenceSummary =
      highItem.scheduledCount === 0
        ? 'No high-priority reminders this period.'
        : `High-priority completion: ${pct(highItem.completionRate)} (${highItem.doneCount}/${highItem.scheduledCount})` +
          (highItem.escalationCount > 0
            ? `. ${highItem.escalationCount} escalation(s) triggered.`
            : '.');

    const criticalAdherenceSummary =
      critItem.scheduledCount === 0
        ? 'No critical reminders this period.'
        : `Critical completion: ${pct(critItem.completionRate)} (${critItem.doneCount}/${critItem.scheduledCount})` +
          (critItem.skipCount > 0
            ? `. ${critItem.skipCount} skip(s) — caregiver alerted.`
            : '.');

    return {
      periodDays,
      priorityBreakdown,
      highAdherenceSummary,
      criticalAdherenceSummary,
    };
  }
}

export const progressService = new ProgressService();
