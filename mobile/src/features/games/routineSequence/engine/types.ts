/**
 * Routine Sequence Builder — Core Type Definitions
 *
 * All game state types defined here for engine purity.
 * No React or UI imports allowed in this file.
 */

// ─── Routine Content ───────────────────────────────────────

export interface RoutineStep {
  stepId: string;
  order: number;
  label: string;
  hint?: string;
  imageAssetId?: string;
}

export interface RoutineTemplate {
  id: string;
  title: string;
  category: string;
  steps: RoutineStep[];
}

// ─── Game Phases ───────────────────────────────────────────

export type GamePhase =
  | 'intro'
  | 'study'
  | 'test'
  | 'feedback'
  | 'level_success'
  | 'session_summary';

// ─── Difficulty & Progression ─────────────────────────────

export interface DifficultyTier {
  tier: number;
  stepCount: number;
  choiceCount: number;
  mode: 'recognition' | 'sequential' | 'reorder' | 'reorder_with_distractor';
  showImages: boolean;
  showHints: boolean;
  delayBetweenStepsMs: number;
}

// ─── Game State ────────────────────────────────────────────

export interface TestStep {
  stepId: string;
  correct: boolean;
  timeMs: number;
  promptsUsed: number;
}

export interface LevelResult {
  levelIndex: number;
  routineId: string;
  routineTitle: string;
  difficultyTier: number;
  mode: DifficultyTier['mode'];
  stepCount: number;
  testSteps: TestStep[];
  accuracy: number; // 0-1 percentage
  promptsUsed: number;
  success: boolean;
  scoreDelta: number;
  startedAt: string;
  completedAt: string;
}

export interface SessionResult {
  gameType: 'routine_sequence';
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  totalScore: number;
  highestTierReached: number;
  routinesAttempted: number;
  routinesCompleted: number;
  averageAccuracy: number;
  averagePromptsUsed: number;
  levelResults: LevelResult[];
}

export interface LevelRecord {
  tier: number;
  accuracy: number;
  promptsUsed: number;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  currentTier: DifficultyTier;
  currentRoutine: RoutineTemplate | null;
  availableRoutines: RoutineTemplate[];
  studyPhaseComplete: boolean;
  testPhaseIndex: number; // Which step we're testing
  testStepResults: TestStep[];
  levelIndex: number;
  totalScore: number;
  highestTierReached: number;
  sessionStartTime: number;
  levelStartTime: number | null;
  levelResults: LevelResult[];
  levelHistory: LevelRecord[];
  promptsUsedThisLevel: number;
  supportMode: boolean;
  distractorSteps: RoutineStep[]; // For higher tiers
}

// ─── Scoring & Progression ─────────────────────────────────

export type LevelOutcome = 'complete' | 'complete_with_support' | 'incomplete';

export interface AdvancementDecision {
  nextTier: number;
  supportMode: boolean;
  reason: 'normal_advance' | 'stay_mixed' | 'support_needed' | 'max_tier';
}

// ─── Engine Exports ────────────────────────────────────────

export type { RoutineTemplate as Routine };
