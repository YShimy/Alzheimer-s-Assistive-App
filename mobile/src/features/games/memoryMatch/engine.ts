/**
 * Associative Memory Match — Client-side engine.
 *
 * Savulich et al. 2017 inspired object-location paired-associate learning.
 */

export interface MemoryMatchItem {
  id: string;
  emoji: string;
  label: string;
  category: string;
}

export interface MemoryMatchLevel {
  level: number;
  gridRows: number;
  gridCols: number;
  itemCount: number;
  studyTimeSeconds: number;
  delaySeconds: number;
  recallMode: 'recognition';
  distractorSimilarity: 'distinct' | 'mild' | 'similar';
}

export interface PlacedItem {
  item: MemoryMatchItem;
  gridIndex: number;
}

export interface StudyLayout {
  level: MemoryMatchLevel;
  items: PlacedItem[];
}

export interface RecallQuestion {
  targetItem: MemoryMatchItem;
  choices: { item: MemoryMatchItem; isCorrect: boolean }[];
  correctGridIndex: number;
}

export const CONTENT_BANK: MemoryMatchItem[] = [
  { id: 'h1', emoji: '🪑', label: 'Chair', category: 'household' },
  { id: 'h2', emoji: '🛏️', label: 'Bed', category: 'household' },
  { id: 'h3', emoji: '🚪', label: 'Door', category: 'household' },
  { id: 'h4', emoji: '🪟', label: 'Window', category: 'household' },
  { id: 'h5', emoji: '📺', label: 'TV', category: 'household' },
  { id: 'h6', emoji: '🛋️', label: 'Sofa', category: 'household' },
  { id: 'h7', emoji: '📻', label: 'Radio', category: 'household' },
  { id: 'h8', emoji: '🕰️', label: 'Clock', category: 'household' },
  { id: 'h9', emoji: '🖼️', label: 'Picture', category: 'household' },
  { id: 'h10', emoji: '🧺', label: 'Basket', category: 'household' },
  { id: 'k1', emoji: '🍎', label: 'Apple', category: 'kitchen' },
  { id: 'k2', emoji: '🥄', label: 'Spoon', category: 'kitchen' },
  { id: 'k3', emoji: '🍽️', label: 'Plate', category: 'kitchen' },
  { id: 'k4', emoji: '🍵', label: 'Cup', category: 'kitchen' },
  { id: 'k5', emoji: '🫖', label: 'Teapot', category: 'kitchen' },
  { id: 'k6', emoji: '🍞', label: 'Bread', category: 'kitchen' },
  { id: 'k7', emoji: '🍌', label: 'Banana', category: 'kitchen' },
  { id: 'k8', emoji: '🥛', label: 'Milk', category: 'kitchen' },
  { id: 'k9', emoji: '🧂', label: 'Salt', category: 'kitchen' },
  { id: 'k10', emoji: '🍳', label: 'Pan', category: 'kitchen' },
  { id: 'k11', emoji: '🥣', label: 'Bowl', category: 'kitchen' },
  { id: 'k12', emoji: '🧈', label: 'Butter', category: 'kitchen' },
  { id: 'c1', emoji: '👟', label: 'Shoe', category: 'clothing' },
  { id: 'c2', emoji: '🧥', label: 'Jacket', category: 'clothing' },
  { id: 'c3', emoji: '🧢', label: 'Hat', category: 'clothing' },
  { id: 'c4', emoji: '🧤', label: 'Gloves', category: 'clothing' },
  { id: 'c5', emoji: '🧦', label: 'Socks', category: 'clothing' },
  { id: 'c6', emoji: '👗', label: 'Dress', category: 'clothing' },
  { id: 'c7', emoji: '👔', label: 'Shirt', category: 'clothing' },
  { id: 'c8', emoji: '🧣', label: 'Scarf', category: 'clothing' },
  { id: 'b1', emoji: '🪥', label: 'Toothbrush', category: 'bathroom' },
  { id: 'b2', emoji: '🧴', label: 'Lotion', category: 'bathroom' },
  { id: 'b3', emoji: '🧼', label: 'Soap', category: 'bathroom' },
  { id: 'b4', emoji: '🧻', label: 'Tissue', category: 'bathroom' },
  { id: 'b5', emoji: '🚿', label: 'Shower', category: 'bathroom' },
  { id: 'b6', emoji: '🛁', label: 'Bath', category: 'bathroom' },
  { id: 'b7', emoji: '🪒', label: 'Razor', category: 'bathroom' },
  { id: 'b8', emoji: '🧽', label: 'Sponge', category: 'bathroom' },
  { id: 'm1', emoji: '💊', label: 'Pills', category: 'medicine' },
  { id: 'm2', emoji: '🩹', label: 'Bandage', category: 'medicine' },
  { id: 'm3', emoji: '🩺', label: 'Stethoscope', category: 'medicine' },
  { id: 'm4', emoji: '🌡️', label: 'Thermometer', category: 'medicine' },
  { id: 'm5', emoji: '💉', label: 'Syringe', category: 'medicine' },
  { id: 'f1', emoji: '🍊', label: 'Orange', category: 'food' },
  { id: 'f2', emoji: '🍇', label: 'Grapes', category: 'food' },
  { id: 'f3', emoji: '🍓', label: 'Strawberry', category: 'food' },
  { id: 'f4', emoji: '🍐', label: 'Pear', category: 'food' },
  { id: 'f5', emoji: '🍉', label: 'Watermelon', category: 'food' },
  { id: 'f6', emoji: '🥕', label: 'Carrot', category: 'food' },
  { id: 'f7', emoji: '🥗', label: 'Salad', category: 'food' },
  { id: 'f8', emoji: '🍗', label: 'Chicken', category: 'food' },
  { id: 'o1', emoji: '🌳', label: 'Tree', category: 'outdoor' },
  { id: 'o2', emoji: '🌻', label: 'Flower', category: 'outdoor' },
  { id: 'o3', emoji: '🚗', label: 'Car', category: 'outdoor' },
  { id: 'o4', emoji: '🏠', label: 'House', category: 'outdoor' },
  { id: 'o5', emoji: '☂️', label: 'Umbrella', category: 'outdoor' },
  { id: 'o6', emoji: '📮', label: 'Mailbox', category: 'outdoor' },
  { id: 'o7', emoji: '🏪', label: 'Store', category: 'outdoor' },
  { id: 'd1', emoji: '📱', label: 'Phone', category: 'daily' },
  { id: 'd2', emoji: '👓', label: 'Glasses', category: 'daily' },
  { id: 'd3', emoji: '🔑', label: 'Key', category: 'daily' },
  { id: 'd4', emoji: '💰', label: 'Wallet', category: 'daily' },
  { id: 'd5', emoji: '📖', label: 'Book', category: 'daily' },
  { id: 'd6', emoji: '✏️', label: 'Pen', category: 'daily' },
  { id: 'd7', emoji: '📅', label: 'Calendar', category: 'daily' },
  { id: 'd8', emoji: '🔦', label: 'Flashlight', category: 'daily' },
  { id: 'd9', emoji: '🎒', label: 'Bag', category: 'daily' },
  { id: 'd10', emoji: '🧸', label: 'Teddy', category: 'daily' },
  { id: 'd11', emoji: '🎵', label: 'Music', category: 'daily' },
];

export const MEMORY_MATCH_LEVELS: MemoryMatchLevel[] = [
  { level: 1, gridRows: 2, gridCols: 2, itemCount: 2, studyTimeSeconds: 20, delaySeconds: 0, recallMode: 'recognition', distractorSimilarity: 'distinct' },
  { level: 2, gridRows: 2, gridCols: 2, itemCount: 3, studyTimeSeconds: 25, delaySeconds: 0, recallMode: 'recognition', distractorSimilarity: 'distinct' },
  { level: 3, gridRows: 2, gridCols: 2, itemCount: 4, studyTimeSeconds: 30, delaySeconds: 0, recallMode: 'recognition', distractorSimilarity: 'distinct' },
  { level: 4, gridRows: 3, gridCols: 2, itemCount: 4, studyTimeSeconds: 30, delaySeconds: 5, recallMode: 'recognition', distractorSimilarity: 'distinct' },
  { level: 5, gridRows: 3, gridCols: 2, itemCount: 5, studyTimeSeconds: 35, delaySeconds: 5, recallMode: 'recognition', distractorSimilarity: 'distinct' },
  { level: 6, gridRows: 3, gridCols: 3, itemCount: 5, studyTimeSeconds: 40, delaySeconds: 8, recallMode: 'recognition', distractorSimilarity: 'distinct' },
  { level: 7, gridRows: 3, gridCols: 3, itemCount: 6, studyTimeSeconds: 45, delaySeconds: 10, recallMode: 'recognition', distractorSimilarity: 'distinct' },
  { level: 8, gridRows: 3, gridCols: 3, itemCount: 6, studyTimeSeconds: 40, delaySeconds: 15, recallMode: 'recognition', distractorSimilarity: 'mild' },
  { level: 9, gridRows: 3, gridCols: 3, itemCount: 7, studyTimeSeconds: 45, delaySeconds: 15, recallMode: 'recognition', distractorSimilarity: 'mild' },
  { level: 10, gridRows: 4, gridCols: 3, itemCount: 7, studyTimeSeconds: 50, delaySeconds: 20, recallMode: 'recognition', distractorSimilarity: 'mild' },
  { level: 11, gridRows: 4, gridCols: 3, itemCount: 8, studyTimeSeconds: 55, delaySeconds: 20, recallMode: 'recognition', distractorSimilarity: 'similar' },
  { level: 12, gridRows: 4, gridCols: 3, itemCount: 8, studyTimeSeconds: 60, delaySeconds: 30, recallMode: 'recognition', distractorSimilarity: 'similar' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}

function pickDistractors(correctItem: MemoryMatchItem, pool: MemoryMatchItem[], count: number, similarity: 'distinct' | 'mild' | 'similar'): MemoryMatchItem[] {
  const others = pool.filter((i) => i.id !== correctItem.id);
  if (similarity === 'distinct') {
    const diffCat = others.filter((i) => i.category !== correctItem.category);
    return pickRandom(diffCat.length >= count ? diffCat : others, count);
  }
  if (similarity === 'mild') {
    const sameCat = others.filter((i) => i.category === correctItem.category);
    const diffCat = others.filter((i) => i.category !== correctItem.category);
    const sameCount = Math.min(Math.floor(count / 2), sameCat.length);
    return [...pickRandom(sameCat, sameCount), ...pickRandom(diffCat, count - sameCount)];
  }
  const sameCat = others.filter((i) => i.category === correctItem.category);
  return pickRandom(sameCat.length >= count ? sameCat : others, count);
}

export function buildSession(levelNumber: number): StudyLayout {
  const level = MEMORY_MATCH_LEVELS.find((l) => l.level === levelNumber);
  if (!level) throw new Error(`Invalid level ${levelNumber}`);

  const selectedItems = pickRandom(CONTENT_BANK, level.itemCount);
  const gridSize = level.gridRows * level.gridCols;
  const indices = shuffle(Array.from({ length: gridSize }, (_, i) => i));

  const placed: PlacedItem[] = selectedItems.map((item, idx) => ({
    item,
    gridIndex: indices[idx]!,
  }));

  return { level, items: placed };
}

export function buildQuestions(layout: StudyLayout): RecallQuestion[] {
  const { level, items } = layout;
  const distractorPool = CONTENT_BANK.filter((i) => !items.some((p) => p.item.id === i.id));

  return shuffle(items).map((placed) => {
    const wrong = pickDistractors(placed.item, distractorPool, 3, level.distractorSimilarity);
    const choices = shuffle([
      { item: placed.item, isCorrect: true },
      ...wrong.map((w) => ({ item: w, isCorrect: false })),
    ]);
    return {
      targetItem: placed.item,
      choices,
      correctGridIndex: placed.gridIndex,
    };
  });
}

export interface ScoreResult {
  score: number;
  accuracyPercent: number;
  timeBonus: number;
}

export function computeScore(correctFirstTry: number, incorrectFirstTry: number, totalItems: number, responseTimesMs: number[]): ScoreResult {
  const accuracyPercent = totalItems > 0 ? (correctFirstTry / totalItems) * 100 : 0;
  const base = correctFirstTry * 100;
  const penalty = incorrectFirstTry * 25;
  let timeBonus = 0;
  if (accuracyPercent >= 80 && responseTimesMs.length > 0) {
    const avg = responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length;
    timeBonus = Math.min(200, Math.max(0, Math.round(300 - avg / 10)));
  }
  return { score: Math.max(0, base - penalty + timeBonus), accuracyPercent, timeBonus };
}

export type AdvanceDecision = 'advance' | 'stay' | 'regress';

export function shouldAdvance(accuracyPercent: number, incorrectFirstTry: number, totalItems: number, completed: boolean): AdvanceDecision {
  if (!completed) return 'stay';
  const threshold = totalItems <= 5 ? 1 : 2;
  if (accuracyPercent >= 80 && incorrectFirstTry <= threshold) return 'advance';
  if (accuracyPercent >= 60) return 'stay';
  return 'regress';
}

export function getHighestLevel(): number {
  return MEMORY_MATCH_LEVELS[MEMORY_MATCH_LEVELS.length - 1]!.level;
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(level, getHighestLevel()));
}
