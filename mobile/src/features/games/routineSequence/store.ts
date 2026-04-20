/**
 * Routine Sequence Builder — Game State Manager (Zustand)
 *
 * Manages the full game lifecycle: intro -> study -> test -> feedback -> summary.
 * Uses pure engine functions for all game logic.
 */
import { create } from 'zustand';
import type { 
  GameState, 
  GamePhase, 
  RoutineTemplate, 
  LevelResult, 
  SessionResult, 
  TestStep,
  LevelRecord 
} from './engine/types';
import { 
  getTier, 
  decideNextTier,
  getSupportConfig 
} from './engine/difficulty';
import { 
  pickRoutine, 
  getDistractorSteps,
  DEFAULT_ROUTINES 
} from './engine/routines';
import { 
  calculateLevelScore, 
  calculateLevelAccuracy, 
  countPromptsUsed,
  isLevelSuccess,
  buildSessionResult 
} from './engine/scoring';

interface RoutineSequenceStore extends GameState {
  // Actions
  startSession: () => void;
  startLevel: () => void;
  completeStudyPhase: () => void;
  submitStepAnswer: (stepId: string, timeMs: number) => { correct: boolean; showPrompt: boolean };
  showPrompt: () => void;
  completeLevel: () => void;
  endSession: () => SessionResult;
  reset: () => void;
  
  // Getters
  getCurrentStep: () => import('./engine/types').RoutineStep | null;
  getAvailableChoices: () => string[];
  getLevelProgress: () => { current: number; total: number };
}

function createInitialState(): GameState {
  return {
    phase: 'intro',
    currentTier: getTier(1),
    currentRoutine: null,
    availableRoutines: DEFAULT_ROUTINES,
    studyPhaseComplete: false,
    testPhaseIndex: 0,
    testStepResults: [],
    levelIndex: 0,
    totalScore: 0,
    highestTierReached: 1,
    sessionStartTime: Date.now(),
    levelStartTime: null,
    levelResults: [],
    levelHistory: [],
    promptsUsedThisLevel: 0,
    supportMode: false,
    distractorSteps: [],
  };
}

export const useRoutineSequenceStore = create<RoutineSequenceStore>((set, get) => ({
  ...createInitialState(),

  startSession: () => {
    const state = get();
    set({
      ...createInitialState(),
      // Preserve progression across sessions
      currentTier: state.currentTier,
      levelHistory: state.levelHistory,
      highestTierReached: state.highestTierReached,
      phase: 'intro',
      sessionStartTime: Date.now(),
    });
  },

  startLevel: () => {
    const state = get();
    const supportConfig = state.supportMode ? getSupportConfig(state.currentTier) : null;
    
    // Apply support adjustments if in support mode
    const effectiveTier = state.supportMode && supportConfig
      ? { ...state.currentTier, choiceCount: supportConfig.reducedChoiceCount }
      : state.currentTier;
    
    // Pick a routine for this tier
    const routine = pickRoutine(effectiveTier);
    if (!routine) {
      // No routine available, end session
      set({ phase: 'session_summary' });
      return;
    }
    
    // Get distractor steps for higher tiers
    let distractorSteps: import('./engine/types').RoutineStep[] = [];
    if (effectiveTier.mode === 'reorder_with_distractor') {
      const distractorCount = effectiveTier.choiceCount - effectiveTier.stepCount;
      distractorSteps = getDistractorSteps(routine, Math.max(1, distractorCount));
    }

    set({
      phase: 'study',
      currentRoutine: routine,
      studyPhaseComplete: false,
      testPhaseIndex: 0,
      testStepResults: [],
      levelStartTime: Date.now(),
      promptsUsedThisLevel: 0,
      distractorSteps,
    });
  },

  completeStudyPhase: () => {
    set({
      phase: 'test',
      studyPhaseComplete: true,
    });
  },

  submitStepAnswer: (stepId: string, timeMs: number) => {
    const state = get();
    if (!state.currentRoutine || state.phase !== 'test') {
      return { correct: false, showPrompt: false };
    }

    const correctStep = state.currentRoutine.steps[state.testPhaseIndex];
    const isCorrect = stepId === correctStep.stepId;
    
    const testStep: TestStep = {
      stepId,
      correct: isCorrect,
      timeMs,
      promptsUsed: 0, // Will be incremented if prompt was shown
    };

    const newResults = [...state.testStepResults, testStep];
    
    // Check if we should show prompt for wrong answer
    const showPrompt = !isCorrect;
    
    // Check if level is complete
    const isLevelComplete = state.testPhaseIndex >= state.currentRoutine.steps.length - 1;
    
    if (isLevelComplete) {
      // Level done - calculate results
      const accuracy = calculateLevelAccuracy(newResults);
      const promptsUsed = countPromptsUsed(newResults) + (showPrompt ? 1 : 0);
      const success = accuracy >= 0.7;
      
      set({
        testStepResults: newResults,
        phase: success ? 'level_success' : 'feedback',
      });
    } else {
      // Continue to next step
      set({
        testStepResults: newResults,
        testPhaseIndex: state.testPhaseIndex + 1,
        phase: showPrompt ? 'feedback' : 'test',
      });
    }

    return { correct: isCorrect, showPrompt };
  },

  showPrompt: () => {
    const state = get();
    set({
      promptsUsedThisLevel: state.promptsUsedThisLevel + 1,
      phase: 'test', // Return to test after showing prompt
    });
  },

  completeLevel: () => {
    const state = get();
    if (!state.currentRoutine || !state.levelStartTime) return;

    const solveTimeMs = Date.now() - state.levelStartTime;
    const accuracy = calculateLevelAccuracy(state.testStepResults);
    const promptsUsed = countPromptsUsed(state.testStepResults) + state.promptsUsedThisLevel;
    const success = isLevelSuccess(state.testStepResults);
    
    const scoreDelta = calculateLevelScore(
      state.currentTier, 
      state.testStepResults, 
      state.supportMode
    );

    const levelResult: LevelResult = {
      levelIndex: state.levelIndex,
      routineId: state.currentRoutine.id,
      routineTitle: state.currentRoutine.title,
      difficultyTier: state.currentTier.tier,
      mode: state.currentTier.mode,
      stepCount: state.currentRoutine.steps.length,
      testSteps: state.testStepResults,
      accuracy,
      promptsUsed,
      success,
      scoreDelta,
      startedAt: new Date(state.levelStartTime).toISOString(),
      completedAt: new Date().toISOString(),
    };

    // Update history for progression
    const newHistory: LevelRecord[] = [...state.levelHistory, { 
      tier: state.currentTier.tier, 
      accuracy,
      promptsUsed,
      timestamp: Date.now() 
    }].slice(-3);

    // Determine next tier (use newHistory which includes current level)
    const decision = decideNextTier(
      state.currentTier.tier,
      accuracy,
      promptsUsed,
      newHistory
    );

    set({
      levelResults: [...state.levelResults, levelResult],
      totalScore: state.totalScore + scoreDelta,
      highestTierReached: Math.max(state.highestTierReached, state.currentTier.tier),
      levelHistory: newHistory,
      currentTier: getTier(decision.nextTier),
      supportMode: decision.supportMode,
      levelIndex: state.levelIndex + 1,
      phase: 'session_summary', // For simplicity, one level per session for now
    });
  },

  endSession: (): SessionResult => {
    const state = get();
    const result = buildSessionResult(
      state.levelResults,
      state.sessionStartTime,
      state.highestTierReached,
    );
    set({ phase: 'session_summary' });
    return result;
  },

  reset: () => {
    set(createInitialState());
  },

  // Getters
  getCurrentStep: () => {
    const state = get();
    if (!state.currentRoutine || state.testPhaseIndex >= state.currentRoutine.steps.length) {
      return null;
    }
    return state.currentRoutine.steps[state.testPhaseIndex];
  },

  getAvailableChoices: () => {
    const state = get();
    if (!state.currentRoutine) return [];

    const currentStep = state.currentRoutine.steps[state.testPhaseIndex];
    const correctChoice = currentStep.stepId;
    
    // Build choices based on tier mode
    let allChoices: string[];
    
    if (state.currentTier.mode === 'reorder_with_distractor') {
      // Include distractors
      const distractorIds = state.distractorSteps.map(s => s.stepId);
      const routineStepIds = state.currentRoutine.steps.map(s => s.stepId);
      allChoices = [...routineStepIds, ...distractorIds];
    } else {
      // Just routine steps
      allChoices = state.currentRoutine.steps.map(s => s.stepId);
    }
    
    // Shuffle and take required count, ensuring correct answer is included
    let choices = allChoices
      .sort(() => Math.random() - 0.5)
      .slice(0, state.currentTier.choiceCount);
    
    if (!choices.includes(correctChoice)) {
      // Replace random choice with correct one
      choices[Math.floor(Math.random() * choices.length)] = correctChoice;
    }
    
    return choices.sort(() => Math.random() - 0.5);
  },

  getLevelProgress: () => {
    const state = get();
    if (!state.currentRoutine) return { current: 0, total: 0 };
    return {
      current: state.testPhaseIndex + 1,
      total: state.currentRoutine.steps.length,
    };
  },
}));
