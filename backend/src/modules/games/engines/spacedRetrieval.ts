/**
 * Spaced Retrieval / Orientation Practice Engine
 *
 * Inspired by spaced retrieval training literature:
 * - Smith et al. 2024: mobile app with daily spaced retrieval for MCI due to AD
 * - Han et al. 2017: tablet-based USMART spaced retrieval program for MCI
 *
 * Repeated retrieval of orientation and personal facts with adaptive intervals.
 */

// ─── Interval Ladder ────────────────────────────────────────────

export const INTERVAL_LADDER_SECONDS = [0, 15, 30, 60, 120, 300, 600];

// Step 7 = mastered for app purposes (10+ min interval)
export const MASTERED_STEP = 7;

// ─── Level Definitions ──────────────────────────────────────────

export interface SRLevel {
  level: number;
  activeItems: number;
  choiceCount: number;
  maxIntervalStep: number;
  cuesAvailable: boolean;
}

export const SPACED_RETRIEVAL_LEVELS: SRLevel[] = [
  { level: 1, activeItems: 2,  choiceCount: 2, maxIntervalStep: 3, cuesAvailable: true },
  { level: 2, activeItems: 3,  choiceCount: 3, maxIntervalStep: 4, cuesAvailable: true },
  { level: 3, activeItems: 4,  choiceCount: 3, maxIntervalStep: 5, cuesAvailable: true },
  { level: 4, activeItems: 5,  choiceCount: 4, maxIntervalStep: 5, cuesAvailable: true },
  { level: 5, activeItems: 6,  choiceCount: 4, maxIntervalStep: 6, cuesAvailable: true },
  { level: 6, activeItems: 7,  choiceCount: 4, maxIntervalStep: 6, cuesAvailable: true },
  { level: 7, activeItems: 8,  choiceCount: 4, maxIntervalStep: 7, cuesAvailable: false },
  { level: 8, activeItems: 10, choiceCount: 4, maxIntervalStep: 7, cuesAvailable: false },
];

// ─── Types ──────────────────────────────────────────────────────

export interface SRItem {
  id: string;
  patientId: string;
  createdByUserId: string;
  prompt: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  distractors?: string[];
  cueText?: string | null;
  category: string;
  active: boolean;
  currentIntervalStep: number;
  currentIntervalSeconds: number;
  masteryStatus: string;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  totalAttempts: number;
  correctAttempts: number;
  lastPracticedAt?: Date | null;
  nextDueAt?: Date | null;
}

export interface AnswerResult {
  newIntervalStep: number;
  newMasteryStatus: string;
  nextDueAt: Date;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  totalAttempts: number;
  correctAttempts: number;
}

export interface PracticeQuestion {
  itemId: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  cueText?: string | null;
  category: string;
}

// ─── Answer Processing ──────────────────────────────────────────

export function processAnswer(
  item: SRItem,
  correct: boolean,
  usedCue: boolean,
): AnswerResult {
  let newStep = item.currentIntervalStep;
  let newConsecutiveCorrect = item.consecutiveCorrect;
  let newConsecutiveIncorrect = item.consecutiveIncorrect;
  let newTotalAttempts = item.totalAttempts + 1;
  let newCorrectAttempts = item.correctAttempts + (correct ? 1 : 0);

  if (correct && !usedCue) {
    newConsecutiveCorrect = item.consecutiveCorrect + 1;
    newConsecutiveIncorrect = 0;
    newStep = Math.min(MASTERED_STEP, item.currentIntervalStep + 1);
  } else if (correct && usedCue) {
    // Cue-assisted: small advancement from low steps only
    newConsecutiveCorrect = item.consecutiveCorrect + 1;
    newConsecutiveIncorrect = 0;
    if (item.currentIntervalStep <= 2) {
      newStep = item.currentIntervalStep + 1;
    } else {
      newStep = item.currentIntervalStep;
    }
  } else {
    // Incorrect
    newConsecutiveCorrect = 0;
    newConsecutiveIncorrect = item.consecutiveIncorrect + 1;
    newStep = Math.max(0, item.currentIntervalStep - 2);
  }

  const newMasteryStatus = newStep >= MASTERED_STEP ? 'MASTERED' : deriveMasteryStatus(newStep, newConsecutiveCorrect, newConsecutiveIncorrect);

  // Compute nextDueAt based on new interval
  const intervalSeconds = newStep < INTERVAL_LADDER_SECONDS.length
    ? INTERVAL_LADDER_SECONDS[newStep]!
    : INTERVAL_LADDER_SECONDS[INTERVAL_LADDER_SECONDS.length - 1]!;

  const nextDueAt = new Date(Date.now() + intervalSeconds * 1000);

  return {
    newIntervalStep: newStep,
    newMasteryStatus,
    nextDueAt,
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveIncorrect: newConsecutiveIncorrect,
    totalAttempts: newTotalAttempts,
    correctAttempts: newCorrectAttempts,
  };
}

function deriveMasteryStatus(step: number, consecutiveCorrect: number, consecutiveIncorrect: number): string {
  if (step >= MASTERED_STEP) return 'MASTERED';
  if (consecutiveIncorrect >= 3) return 'NEEDS_REVIEW';
  if (step >= 4 && consecutiveCorrect >= 3) return 'STRENGTHENING';
  if (step >= 1 && consecutiveCorrect >= 2) return 'LEARNING';
  return 'NEW';
}

// ─── Distractor Generation ────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateDistractors(
  correctAnswer: string,
  allItems: SRItem[],
  count: number,
): string[] {
  // Gather plausible wrong answers from other items' answers
  const otherAnswers = allItems
    .filter((i) => i.correctAnswer !== correctAnswer)
    .map((i) => i.correctAnswer);

  const uniqueOthers = [...new Set(otherAnswers)];
  const shuffled = shuffle(uniqueOthers);
  const picked = shuffled.slice(0, count - 1);

  // If not enough other answers, pad with generic options
  const generics = [
    "I'm not sure",
    "Maybe later",
    "I need help",
    'Something else',
  ];
  while (picked.length < count - 1) {
    const next = generics[picked.length % generics.length];
    if (!picked.includes(next) && next !== correctAnswer) {
      picked.push(next);
    } else {
      picked.push(`Option ${picked.length + 1}`);
    }
  }

  return shuffle([...picked, correctAnswer]);
}

// ─── Session Queue Builder ──────────────────────────────────────

export interface SRSessionConfig {
  level: number;
  maxQuestions: number;
}

export function buildPracticeQueue(
  items: SRItem[],
  config: SRSessionConfig,
): PracticeQuestion[] {
  const levelDef = SPACED_RETRIEVAL_LEVELS.find((l) => l.level === config.level);
  if (!levelDef) throw new Error(`Invalid SR level: ${config.level}`);

  const now = new Date();

  // 1. Due items (nextDueAt <= now)
  const dueItems = items
    .filter((i) => i.active && (!i.nextDueAt || i.nextDueAt <= now))
    .sort((a, b) => {
      const aDue = a.nextDueAt ? a.nextDueAt.getTime() : 0;
      const bDue = b.nextDueAt ? b.nextDueAt.getTime() : 0;
      return aDue - bDue;
    });

  // 2. NEW items that haven't been practiced yet (fill queue if insufficient due items)
  const newItems = items
    .filter((i) => i.active && i.masteryStatus === 'NEW' && (!i.nextDueAt || i.nextDueAt > now))
    .slice(0, Math.max(0, levelDef.activeItems - dueItems.length));

  // 3. Combine and limit to activeItems cap
  const queueItems = [...dueItems, ...newItems].slice(0, levelDef.activeItems);

  // 4. Build questions
  return queueItems.map((item) => {
    const choices = item.distractors && item.distractors.length >= levelDef.choiceCount - 1
      ? shuffle([...item.distractors.slice(0, levelDef.choiceCount - 1), item.correctAnswer])
      : generateDistractors(item.correctAnswer, items, levelDef.choiceCount);

    return {
      itemId: item.id,
      prompt: item.prompt,
      choices,
      correctAnswer: item.correctAnswer,
      cueText: item.cueText,
      category: item.category,
    };
  });
}

// ─── Session Scoring ────────────────────────────────────────────

export interface SRSessionScore {
  accuracyPercent: number;
  cueUseRate: number;
  score: number;
  correctWithoutCue: number;
  correctWithCue: number;
  incorrect: number;
  unsureCount: number;
}

export function computeSRSessionScore(results: { correct: boolean; usedCue: boolean; unsure: boolean }[]): SRSessionScore {
  const total = results.length;
  if (total === 0) {
    return {
      accuracyPercent: 0,
      cueUseRate: 0,
      score: 0,
      correctWithoutCue: 0,
      correctWithCue: 0,
      incorrect: 0,
      unsureCount: 0,
    };
  }

  const correctWithoutCue = results.filter((r) => r.correct && !r.usedCue && !r.unsure).length;
  const correctWithCue = results.filter((r) => r.correct && r.usedCue && !r.unsure).length;
  const incorrect = results.filter((r) => !r.correct && !r.unsure).length;
  const unsureCount = results.filter((r) => r.unsure).length;

  const accuracyPercent = ((correctWithoutCue + correctWithCue) / total) * 100;
  const cueUseRate = ((correctWithCue + unsureCount) / total) * 100;

  // Weighted score
  const score = correctWithoutCue * 100 + correctWithCue * 60;

  return {
    accuracyPercent,
    cueUseRate,
    score,
    correctWithoutCue,
    correctWithCue,
    incorrect,
    unsureCount,
  };
}

// ─── Level Advancement ──────────────────────────────────────────

export function shouldAdvanceSRLevel(
  accuracyPercent: number,
  cueUseRate: number,
  sessionsAtCurrentLevel: number,
  recentAbandonedCount: number,
  recentSessionCount: number,
): boolean {
  if (accuracyPercent < 85) return false;
  if (cueUseRate > 25) return false;
  if (sessionsAtCurrentLevel < 3) return false;
  if (recentSessionCount > 0 && recentAbandonedCount > 1) return false;
  return true;
}

export function clampSRLevel(level: number): number {
  const min = SPACED_RETRIEVAL_LEVELS[0]!.level;
  const max = SPACED_RETRIEVAL_LEVELS[SPACED_RETRIEVAL_LEVELS.length - 1]!.level;
  return Math.max(min, Math.min(level, max));
}
