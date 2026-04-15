/**
 * Helper utilities for streak calculation.
 */

export interface StreakResult {
  current: number;
  best: number;
  lastActiveDate: string | null;
}

/**
 * Calculates current and best streaks from a sorted array of active local date strings (YYYY-MM-DD).
 * @param activeDates Array of YYYY-MM-DD strings format, MUST be sorted descending (newest first).
 * @param todayStr The YYYY-MM-DD string format for the user's current local day.
 */
export function calculateStreaks(activeDates: string[], todayStr: string): StreakResult {
  if (!activeDates.length) {
    return { current: 0, best: 0, lastActiveDate: null };
  }

  // Deduplicate strings just in case
  const uniqueDates = Array.from(new Set(activeDates));
  
  let current = 0;
  let best = 0;
  let currentRun = 0;

  // We walk backwards from today.
  // Actually, since dates are sorted descending, let's walk through them.
  let expectedNextDay = new Date(todayStr); 

  // To allow checking if yesterday or today was active
  let isCurrentStreakAlive = true;

  // Compute best and current
  // Simple O(N) pass to find all connected components
  let tempStreak = 1;
  best = 1;
  const lastActiveDate = uniqueDates[0];

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const currD = new Date(uniqueDates[i]);
    const prevD = new Date(uniqueDates[i+1]);
    
    const diffTime = currD.getTime() - prevD.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      tempStreak++;
      if (tempStreak > best) best = tempStreak;
    } else {
      tempStreak = 1;
    }
  }

  // To find CURRENT streak, we only care if uniqueDates[0] is today or yesterday.
  const diffFromToday = Math.round((new Date(todayStr).getTime() - new Date(uniqueDates[0]).getTime()) / (1000 * 3600 * 24));
  
  if (diffFromToday === 0 || diffFromToday === 1) {
    currentRun = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const currD = new Date(uniqueDates[i]);
      const prevD = new Date(uniqueDates[i+1]);
      const diffDays = Math.round((currD.getTime() - prevD.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else {
        break;
      }
    }
    current = currentRun;
  } else {
    current = 0;
  }

  return {
    current,
    best,
    lastActiveDate
  };
}
