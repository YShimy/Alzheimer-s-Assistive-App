/**
 * Spaced Retrieval / Personal Orientation Practice — Client-side engine.
 *
 * Evidence-informed reality orientation and spaced retrieval training.
 * Citations: Savulich et al., 2017; Han et al., 2017; Smith et al., 2024.
 *
 * Updated: supports image fields for question images and clue images,
 * and builds contact-based people-recognition questions automatically.
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
  // Image fields (from backend MediaAsset join)
  imageAssetId?: string | null;
  clueImageAssetId?: string | null;
  imageUrl?: string | null;
  clueImageUrl?: string | null;
  // Contact link
  linkedContactId?: string | null;
}

/** A game-eligible contact with photo/memo details. */
export interface GameContact {
  id: string;
  displayName: string;
  relationLabel?: string | null;
  shortMemo?: string | null;
  photoUrl?: string | null;
  supportRole?: string | null;
  isSensitive?: boolean;
}

export interface PracticeQuestion {
  itemId: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  cueText?: string | null;
  category: string;
  // Image support
  imageUrl?: string | null;
  clueImageUrl?: string | null;
  // Source metadata
  isContactQuestion?: boolean;
  contactId?: string | null;
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

/**
 * Build practice questions from caregiver-configured SR items.
 * Items now carry imageUrl and clueImageUrl for photo-based questions.
 */
export function buildQuestions(
  items: SRItem[],
  supportLevel: SupportLevel = 'GUIDED_SUPPORT',
  enabledFamilies?: string[],
  maxQuestions?: number,
): PracticeQuestion[] {
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

  // Prioritize items with images — they should always be included
  const withImage = shuffle(filtered.filter((i) => !!i.imageUrl || !!i.clueImageUrl));
  const withoutImage = shuffle(filtered.filter((i) => !i.imageUrl && !i.clueImageUrl));
  const selectedItems = [...withImage, ...withoutImage].slice(0, limit);

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
      imageUrl: item.imageUrl ?? null,
      clueImageUrl: item.clueImageUrl ?? null,
      isContactQuestion: false,
      contactId: item.linkedContactId ?? null,
    };
  });
}

/**
 * Build people-recognition questions from game-eligible contacts.
 * These are auto-generated from contacts with a photo and includeInGame=true.
 * Caregiver-typed SR items with linkedContactId take priority (deduplicated).
 *
 * @param contacts     List of game contacts (from /spaced-retrieval/game-contacts)
 * @param srItems      Existing SR items (to deduplicate by linkedContactId)
 * @param supportLevel Current support level (controls choice count)
 * @param allNames     All contact display names (used as distractors for name questions)
 */
export function buildContactQuestions(
  contacts: GameContact[],
  srItems: SRItem[],
  supportLevel: SupportLevel = 'GUIDED_SUPPORT',
  allNames?: string[],
): PracticeQuestion[] {
  // Skip contacts already covered by a linked SR item
  const linkedContactIds = new Set(srItems.map((i) => i.linkedContactId).filter(Boolean));
  const unlinked = contacts.filter((c) => !linkedContactIds.has(c.id));

  let choiceCount = 3;
  if (supportLevel === 'LIGHT_SUPPORT') choiceCount = 4;
  else if (supportLevel === 'HIGH_SUPPORT') choiceCount = 2;

  const namePool = allNames ?? contacts.map((c) => c.displayName);

  return unlinked.map((contact) => {
    const hasPhoto = !!contact.photoUrl;
    const relationLabel = contact.relationLabel ?? contact.supportRole ?? 'person';

    // Build choices: other contact names as distractors for name questions
    const otherNames = namePool.filter((n) => n !== contact.displayName);
    const wrong = shuffle(otherNames).slice(0, choiceCount - 1);
    const choices = shuffle([...wrong, contact.displayName]);

    return {
      // Use a synthetic itemId so results can be tracked
      itemId: `contact-${contact.id}`,
      prompt: hasPhoto
        ? `Who is this person?`
        : `Who is your ${relationLabel}?`,
      choices: choices.length >= choiceCount ? choices : shuffle([contact.displayName, 'Someone else', 'Not sure']),
      correctAnswer: contact.displayName,
      cueText: contact.shortMemo ?? `Your ${relationLabel}`,
      category: 'PEOPLE_RECOGNITION',
      imageUrl: contact.photoUrl ?? null,
      clueImageUrl: null,
      isContactQuestion: true,
      contactId: contact.id,
    };
  });
}

/**
 * Merge caregiver SR questions and contact questions.
 * Caregiver items take priority (listed first).
 * Contact questions fill remaining slots up to maxQuestions.
 */
export function mergeAndLimitQuestions(
  srQuestions: PracticeQuestion[],
  contactQuestions: PracticeQuestion[],
  maxQuestions: number,
): PracticeQuestion[] {
  const combined = [...srQuestions, ...contactQuestions];

  // Prioritize questions with photos — they should always be included
  const withPhoto = combined.filter((q) => !!q.imageUrl);
  const withoutPhoto = combined.filter((q) => !q.imageUrl);
  const prioritized = [...shuffle(withPhoto), ...shuffle(withoutPhoto)];
  return shuffle(prioritized.slice(0, maxQuestions));
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
