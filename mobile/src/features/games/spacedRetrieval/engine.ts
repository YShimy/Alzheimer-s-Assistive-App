/**
 * Spaced Retrieval / Orientation Practice — Client-side engine.
 *
 * Smith et al. 2024 and Han et al. 2017 inspired spaced retrieval training.
 */

export const INTERVAL_LADDER_SECONDS = [0, 15, 30, 60, 120, 300, 600];
export const MASTERED_STEP = 7;

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
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildQuestions(items: SRItem[], choiceCount = 4, maxQuestions = 5): PracticeQuestion[] {
  const activeItems = items.filter((i) => i.active);
  return shuffle(activeItems).slice(0, maxQuestions).map((item) => {
    const pool = activeItems.filter((i) => i.id !== item.id).map((i) => i.correctAnswer);
    const uniquePool = [...new Set(pool)];
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
): AnswerResult {
  let newStep = item.currentIntervalStep;
  let newConsecutiveCorrect = usedCue ? 0 : (correct ? 1 : 0); // simplified
  let newConsecutiveIncorrect = correct ? 0 : 1;

  if (correct && !usedCue) {
    newStep = Math.min(MASTERED_STEP, item.currentIntervalStep + 1);
    newConsecutiveCorrect = item.currentIntervalStep + 1 >= MASTERED_STEP ? 3 : 1;
  } else if (correct && usedCue) {
    if (item.currentIntervalStep <= 2) {
      newStep = item.currentIntervalStep + 1;
    }
  } else {
    newStep = Math.max(0, item.currentIntervalStep - 2);
  }

  const newMasteryStatus = newStep >= MASTERED_STEP ? 'MASTERED' : item.masteryStatus;
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

export function computeSessionScore(results: { correct: boolean; usedCue: boolean; unsure: boolean }[]): SessionScore {
  const total = results.length;
  if (total === 0) {
    return { accuracyPercent: 0, cueUseRate: 0, score: 0, correctWithoutCue: 0, correctWithCue: 0, incorrect: 0, unsureCount: 0 };
  }
  const correctWithoutCue = results.filter((r) => r.correct && !r.usedCue && !r.unsure).length;
  const correctWithCue = results.filter((r) => r.correct && r.usedCue && !r.unsure).length;
  const incorrect = results.filter((r) => !r.correct && !r.unsure).length;
  const unsureCount = results.filter((r) => r.unsure).length;
  return {
    accuracyPercent: ((correctWithoutCue + correctWithCue) / total) * 100,
    cueUseRate: ((correctWithCue + unsureCount) / total) * 100,
    score: correctWithoutCue * 100 + correctWithCue * 60,
    correctWithoutCue,
    correctWithCue,
    incorrect,
    unsureCount,
  };
}
