/**
 * Routine Sequence Builder — Routine Content & Templates
 *
 * Pre-defined daily routines for the game.
 * Can be extended to pull from checklist templates.
 */
import type { RoutineTemplate } from './types';

// ─── Default Routine Templates ─────────────────────────────

export const DEFAULT_ROUTINES: RoutineTemplate[] = [
  {
    id: 'morning-coffee',
    title: 'Make Coffee',
    category: 'morning',
    steps: [
      { stepId: 'mc-1', order: 1, label: 'Fill kettle with water', hint: 'Use fresh cold water' },
      { stepId: 'mc-2', order: 2, label: 'Boil the water', hint: 'Wait for it to bubble' },
      { stepId: 'mc-3', order: 3, label: 'Add coffee to cup', hint: 'One spoonful is enough' },
      { stepId: 'mc-4', order: 4, label: 'Pour hot water', hint: 'Be careful, it is hot' },
      { stepId: 'mc-5', order: 5, label: 'Stir and enjoy', hint: 'Mix well before drinking' },
    ],
  },
  {
    id: 'wash-hands',
    title: 'Wash Hands',
    category: 'hygiene',
    steps: [
      { stepId: 'wh-1', order: 1, label: 'Turn on the tap', hint: 'Use warm water' },
      { stepId: 'wh-2', order: 2, label: 'Wet your hands', hint: 'Get them fully wet' },
      { stepId: 'wh-3', order: 3, label: 'Apply soap', hint: 'A small amount is enough' },
      { stepId: 'wh-4', order: 4, label: 'Rub for 20 seconds', hint: 'Sing Happy Birthday twice' },
      { stepId: 'wh-5', order: 5, label: 'Rinse thoroughly', hint: 'Wash all soap away' },
      { stepId: 'wh-6', order: 6, label: 'Dry with towel', hint: 'Pat gently, do not rub' },
    ],
  },
  {
    id: 'getting-ready',
    title: 'Get Ready to Go Out',
    category: 'daily',
    steps: [
      { stepId: 'gr-1', order: 1, label: 'Check the weather', hint: 'Look outside or check phone' },
      { stepId: 'gr-2', order: 2, label: 'Choose appropriate clothes', hint: 'Dress for the weather' },
      { stepId: 'gr-3', order: 3, label: 'Put on shoes', hint: 'Comfortable walking shoes' },
      { stepId: 'gr-4', order: 4, label: 'Check pockets for keys', hint: 'Keys, wallet, phone' },
      { stepId: 'gr-5', order: 5, label: 'Lock the door', hint: 'Turn key until it clicks' },
    ],
  },
  {
    id: 'prepare-tea',
    title: 'Make Tea',
    category: 'kitchen',
    steps: [
      { stepId: 'pt-1', order: 1, label: 'Fill kettle with water', hint: 'Fresh cold water' },
      { stepId: 'pt-2', order: 2, label: 'Boil the water', hint: 'Wait for bubbles' },
      { stepId: 'pt-3', order: 3, label: 'Place tea bag in cup', hint: 'One bag per cup' },
      { stepId: 'pt-4', order: 4, label: 'Pour hot water', hint: 'Fill to near the top' },
      { stepId: 'pt-5', order: 5, label: 'Steep for 3 minutes', hint: 'Wait patiently' },
      { stepId: 'pt-6', order: 6, label: 'Remove tea bag', hint: 'Squeeze gently against side' },
    ],
  },
  {
    id: 'take-medication',
    title: 'Take Medication',
    category: 'health',
    steps: [
      { stepId: 'tm-1', order: 1, label: 'Read the label carefully', hint: 'Check name and dosage' },
      { stepId: 'tm-2', order: 2, label: 'Get a glass of water', hint: 'Room temperature is best' },
      { stepId: 'tm-3', order: 3, label: 'Take the correct dose', hint: 'Count the pills' },
      { stepId: 'tm-4', order: 4, label: 'Swallow with water', hint: 'Drink all the water' },
      { stepId: 'tm-5', order: 5, label: 'Note that you took it', hint: 'Check off or mark time' },
    ],
  },
  {
    id: 'brush-teeth',
    title: 'Brush Teeth',
    category: 'hygiene',
    steps: [
      { stepId: 'bt-1', order: 1, label: 'Wet the toothbrush', hint: 'Run under tap briefly' },
      { stepId: 'bt-2', order: 2, label: 'Apply toothpaste', hint: 'Pea-sized amount' },
      { stepId: 'bt-3', order: 3, label: 'Brush for 2 minutes', hint: 'All sides, top and bottom' },
      { stepId: 'bt-4', order: 4, label: 'Rinse mouth', hint: 'Spit, do not swallow' },
      { stepId: 'bt-5', order: 5, label: 'Rinse toothbrush', hint: 'Clean the brush' },
    ],
  },
  {
    id: 'make-bed',
    title: 'Make the Bed',
    category: 'household',
    steps: [
      { stepId: 'mb-1', order: 1, label: 'Pull up the fitted sheet', hint: 'Tuck under mattress' },
      { stepId: 'mb-2', order: 2, label: 'Spread the top sheet', hint: 'Even on both sides' },
      { stepId: 'mb-3', order: 3, label: 'Add the blanket or duvet', hint: 'Center it nicely' },
      { stepId: 'mb-4', order: 4, label: 'Arrange pillows', hint: 'Fluff and place at head' },
    ],
  },
  {
    id: 'water-plants',
    title: 'Water the Plants',
    category: 'household',
    steps: [
      { stepId: 'wp-1', order: 1, label: 'Check if soil is dry', hint: 'Stick finger an inch down' },
      { stepId: 'wp-2', order: 2, label: 'Fill watering can', hint: 'Room temperature water' },
      { stepId: 'wp-3', order: 3, label: 'Pour slowly at base', hint: 'Avoid getting leaves wet' },
      { stepId: 'wp-4', order: 4, label: 'Let water soak in', hint: 'Wait a moment' },
      { stepId: 'wp-5', order: 5, label: 'Empty excess water', hint: 'Drain the saucer' },
    ],
  },
];

// ─── Routine Selection ─────────────────────────────────────

/**
 * Get routines that match the step count for a difficulty tier.
 */
export function getRoutinesForTier(tier: { stepCount: number }): RoutineTemplate[] {
  return DEFAULT_ROUTINES.filter(r => r.steps.length === tier.stepCount);
}

/**
 * Pick a random routine from available options.
 */
export function pickRoutine(tier: { stepCount: number }): RoutineTemplate | null {
  const options = getRoutinesForTier(tier);
  if (options.length === 0) {
    // Fallback: find closest match
    const all = DEFAULT_ROUTINES.filter(r => r.steps.length >= tier.stepCount);
    if (all.length === 0) return null;
    
    // Pick one with closest step count
    const closest = all.reduce((best, current) => {
      const currentDiff = Math.abs(current.steps.length - tier.stepCount);
      const bestDiff = Math.abs(best.steps.length - tier.stepCount);
      return currentDiff < bestDiff ? current : best;
    });
    
    // Truncate to tier's step count
    return {
      ...closest,
      steps: closest.steps.slice(0, tier.stepCount),
    };
  }
  
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get distractor steps from other routines for higher tiers.
 */
export function getDistractorSteps(
  correctRoutine: RoutineTemplate, 
  count: number
): import('./types').RoutineStep[] {
  const otherRoutines = DEFAULT_ROUTINES.filter(r => r.id !== correctRoutine.id);
  const allSteps = otherRoutines.flatMap(r => r.steps);
  
  // Shuffle and take requested count
  const shuffled = [...allSteps].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
