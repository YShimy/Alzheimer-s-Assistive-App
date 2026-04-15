import { prisma } from '../../../shared/db/prisma.js';
import { calculateStreaks, StreakResult } from '../helpers/streak.helper.js';
import { getLocalDayStart, formatLocalDateStr, generateDateRangeStrings, getStartOfDaysAgo } from '../helpers/date.helper.js';
import type { 
  ProgressOverviewResponse, 
  ProgressStreaksResponse, 
  ProgressCategoriesResponse, 
  ProgressChartsResponse,
  CategoryMetric,
  ChartSeriesData
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

    dateStrings.forEach(d => {
      remMap.set(d, { date: d, actedCount: 0, scheduledCount: 0, completionRate: 0 });
      chkMap.set(d, { date: d, startedRuns: 0, completedRuns: 0, completionRate: 0 });
      gameScrMap.set(d, { date: d, score: 0 });
      gameTierMap.set(d, { date: d, highestTier: 0 });
    });

    const [remEvts, chkRuns, gmRuns] = await Promise.all([
      prisma.reminderEvent.findMany({ where: { patientUserId: patientId, timestamp: { gte: startWindow } }, select: { timestamp: true, eventType: true } }),
      prisma.checklistRun.findMany({ where: { patientUserId: patientId, createdAt: { gte: startWindow } }, select: { createdAt: true, status: true } }),
      prisma.gameSession.findMany({ where: { patientUserId: patientId, startedAt: { gte: startWindow } }, select: { startedAt: true, score: true, highestTierReached: true } })
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

    dateStrings.forEach(d => {
      const rm = remMap.get(d)!;
      rm.completionRate = rm.scheduledCount ? (rm.actedCount! / rm.scheduledCount) : 0;
      
      const ch = chkMap.get(d)!;
      ch.completionRate = ch.startedRuns ? (ch.completedRuns! / ch.startedRuns) : 0;

      const sc = gameScrMap.get(d)!;
      const scores = scoreAgg.get(d) || [];
      sc.score = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    });

    return {
      reminderSeries: Array.from(remMap.values()),
      checklistSeries: Array.from(chkMap.values()),
      gameScoreSeries: Array.from(gameScrMap.values()),
      gameTierSeries: Array.from(gameTierMap.values())
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
      if (e.eventType === 'FIRED') metric.scheduledCount = (metric.scheduledCount||0) + 1;
      if (['DONE', 'SNOOZED', 'SKIPPED'].includes(e.eventType)) metric.actedCount = (metric.actedCount||0) + 1;
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
}

export const progressService = new ProgressService();
