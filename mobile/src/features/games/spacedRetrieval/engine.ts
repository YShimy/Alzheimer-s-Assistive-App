/**
 * Spaced Retrieval / Personal Orientation Practice — Client-side engine.
 *
 * Evidence-informed reality orientation and spaced retrieval training.
 * Citations: Savulich et al., 2017; Han et al., 2017; Smith et al., 2024.
 */

export const INTERVAL_LADDER_SECONDS = [0, 15, 30, 60, 120, 300, 600];
export const MASTERED_STEP = 5;

export type SupportLevel = 'LIGHT_SUPPORT' | 'GUIDED_SUPPORT' | 'HIGH_SUPPORT';

export interface SRItem {
  id: string;
  prompt: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  distractors?: string[];
  cueText?: string | null;
  category: string;
  active: boolean;
  currentIntervalStep: number;
  masteryStatus: string;
  patientVisible?: boolean;
  supportLevelOverride?: string | null;
}

export interface PracticeQuestion {
  itemId: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  cueText?: string | null;
  category: string;
}

export interface AnswerResult {
  newIntervalStep: number;
  newMasteryStatus: string;
  nextDueAt: Date;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
}

export interface SessionScore {
  accuracyPercent: number;
  cueUseRate: number;
  score: number;
  correctWithoutCue: number;
  correctWithCue: number;
  incorrect: number;
  unsureCount: number;
  levelReached: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildQuestions(items: SRItem[], supportLevel: SupportLevel = 'GUIDED_SUPPORT', enabledFamilies?: string[], maxQuestions?: number): PracticeQuestion[] {
  const activeItems = items.filter((i) => i.active && (i.patientVisible !== false));
  const filtered = enabledFamilies ? activeItems.filter((i) => enabledFamilies.includes(i.category)) : activeItems;
  
  let choiceCount = 3;
  let defaultCount = 6;
  if (supportLevel === 'LIGHT_SUPPORT') {
    choiceCount = 4;
    defaultCount = 8;
  } else if (supportLevel === 'HIGH_SUPPORT') {
    choiceCount = 2;
    defaultCount = 4;
  }

  const limit = maxQuestions && maxQuestions > 0 ? maxQuestions : defaultCount;
  const selectedItems = shuffle(filtered).slice(0, limit);

  return selectedItems.map((item) => {
    // Generate safe distractors
    const explicitDistractors = item.distractors ?? [];
    let pool = [...explicitDistractors];
    if (pool.length < choiceCount - 1) {
      const otherAnswers = activeItems
        .filter((i) => i.id !== item.id && i.category === item.category)
        .map((i) => i.correctAnswer);
      pool = [...pool, ...otherAnswers];
    }
    if (pool.length < choiceCount - 1) {
      const allAnswers = activeItems.filter((i) => i.id !== item.id).map((i) => i.correctAnswer);
      pool = [...pool, ...allAnswers, 'Monday', 'Morning', 'Home', 'Doctor', 'Yes'];
    }

    const uniquePool = [...new Set(pool.filter((s) => s.toLowerCase() !== item.correctAnswer.toLowerCase()))];
    const wrong = shuffle(uniquePool).slice(0, choiceCount - 1);
    const choices = shuffle([...wrong, item.correctAnswer]);

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

export function processAnswer(
  item: SRItem,
  correct: boolean,
  usedCue: boolean,
  unsure: boolean = false,
): AnswerResult {
  let newStep = item.currentIntervalStep;
  let newConsecutiveCorrect = usedCue || unsure ? 0 : (correct ? 1 : 0);
  let newConsecutiveIncorrect = correct || unsure ? 0 : 1;

  if (correct && !usedCue && !unsure) {
    newStep = Math.min(MASTERED_STEP, item.currentIntervalStep + 1);
  } else if (correct && usedCue && !unsure) {
    if (item.currentIntervalStep <= 2) {
      newStep = item.currentIntervalStep + 1;
    }
  } else if (unsure) {
    newStep = Math.max(0, item.currentIntervalStep - 1);
  } else {
    newStep = Math.max(0, item.currentIntervalStep - 2);
  }

  let newMasteryStatus = item.masteryStatus;
  if (newStep === 0) newMasteryStatus = 'NEW';
  else if (newStep === 1 || newStep === 2) newMasteryStatus = 'LEARNING';
  else if (newStep === 3 || newStep === 4) newMasteryStatus = 'STRENGTHENING';
  else if (newStep >= 5) newMasteryStatus = 'MASTERED';

  if (!correct && !unsure && item.masteryStatus === 'MASTERED') {
    newMasteryStatus = 'NEEDS_REVIEW';
  }

  const intervalSeconds = newStep < INTERVAL_LADDER_SECONDS.length
    ? INTERVAL_LADDER_SECONDS[newStep]
    : INTERVAL_LADDER_SECONDS[INTERVAL_LADDER_SECONDS.length - 1];

  return {
    newIntervalStep: newStep,
    newMasteryStatus,
    nextDueAt: new Date(Date.now() + intervalSeconds! * 1000),
    consecutiveCorrect: newConsecutiveCorrect,
    consecutiveIncorrect: newConsecutiveIncorrect,
  };
}

export function computeSessionScore(results: { correct: boolean; usedCue: boolean; unsure: boolean; item?: SRItem }[]): SessionScore {
  const total = results.length;
  if (total === 0) {
    return { accuracyPercent: 0, cueUseRate: 0, score: 0, correctWithoutCue: 0, correctWithCue: 0, incorrect: 0, unsureCount: 0, levelReached: 1 };
  }
  const correctWithoutCue = results.filter((r) => r.correct && !r.usedCue && !r.unsure).length;
  const correctWithCue = results.filter((r) => r.correct && r.usedCue && !r.unsure).length;
  const incorrect = results.filter((r) => !r.correct && !r.unsure).length;
  const unsureCount = results.filter((r) => r.unsure).length;
  
  // Prompt score rules: Correct without cue (100), correct with cue (60), I'm not sure (30), wrong (0)
  const score = correctWithoutCue * 100 + correctWithCue * 60 + unsureCount * 30;
  
  // Level 1 to 6 calculation based on mastery steps
  const steps = results.map((r) => r.item?.currentIntervalStep ?? 1);
  const avgStep = steps.reduce((a, b) => a + b, 0) / steps.length;
  const levelReached = Math.min(6, Math.max(1, Math.round(avgStep + 1)));

  return {
    accuracyPercent: ((correctWithoutCue + correctWithCue) / total) * 100,
    cueUseRate: ((correctWithCue + unsureCount) / total) * 100,
    score,
    correctWithoutCue,
    correctWithCue,
    incorrect,
    unsureCount,
    levelReached,
  };
}
