/**
 * Memory Match session store (Zustand).
 */
import { create } from 'zustand';
import type { StudyLayout, RecallQuestion, ScoreResult, AdvanceDecision } from './engine';

export type GamePhase = 'intro' | 'study' | 'delay' | 'recall' | 'result';

interface MemoryMatchState {
  phase: GamePhase;
  level: number;
  layout: StudyLayout | null;
  questions: RecallQuestion[];
  currentQuestionIndex: number;
  correctFirstTry: number;
  incorrectFirstTry: number;
  /** Per-question correctness (index matches questions array) — fixes backend submission bug */
  answerResults: boolean[];
  responseTimesMs: number[];
  questionStartTime: number;
  scoreResult: ScoreResult | null;
  advanceDecision: AdvanceDecision | null;
  /** Next level as computed by backend (or local fallback). Read before reset() on Practice Again. */
  nextLevel: number | null;
  levelChange: 'advance' | 'stay' | 'regress' | null;
  levelMessage: string;
  sessionId: string | null;
  startedAt: number;

  // Actions
  startSession: (level: number, layout: StudyLayout, questions: RecallQuestion[], sessionId: string) => void;
  setPhase: (phase: GamePhase) => void;
  answerQuestion: (isCorrect: boolean, responseTimeMs: number) => void;
  nextQuestion: () => void;
  finishSession: (
    scoreResult: ScoreResult,
    advanceDecision: AdvanceDecision,
    nextLevel: number,
    levelChange?: 'advance' | 'stay' | 'regress',
    levelMessage?: string,
  ) => void;
  reset: () => void;
}

function initialState(): Omit<MemoryMatchState, keyof {
  startSession: any; setPhase: any; answerQuestion: any; nextQuestion: any; finishSession: any; reset: any;
}> {
  return {
    phase: 'intro',
    level: 1,
    layout: null,
    questions: [],
    currentQuestionIndex: 0,
    correctFirstTry: 0,
    incorrectFirstTry: 0,
    answerResults: [],
    responseTimesMs: [],
    questionStartTime: 0,
    scoreResult: null,
    advanceDecision: null,
    nextLevel: null,
    levelChange: null,
    levelMessage: '',
    sessionId: null,
    startedAt: 0,
  };
}

export const useMemoryMatchStore = create<MemoryMatchState>((set) => ({
  ...initialState(),

  startSession: (level, layout, questions, sessionId) =>
    set({
      level,
      layout,
      questions,
      sessionId,
      phase: 'study',
      currentQuestionIndex: 0,
      correctFirstTry: 0,
      incorrectFirstTry: 0,
      answerResults: [],
      responseTimesMs: [],
      questionStartTime: Date.now(),
      scoreResult: null,
      advanceDecision: null,
      nextLevel: null,
      levelChange: null,
      levelMessage: '',
      startedAt: Date.now(),
    }),

  setPhase: (phase) => set({ phase }),

  answerQuestion: (isCorrect, responseTimeMs) =>
    set((state) => ({
      correctFirstTry: state.correctFirstTry + (isCorrect ? 1 : 0),
      incorrectFirstTry: state.incorrectFirstTry + (isCorrect ? 0 : 1),
      answerResults: [...state.answerResults, isCorrect],
      responseTimesMs: [...state.responseTimesMs, responseTimeMs],
    })),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
      questionStartTime: Date.now(),
    })),

  finishSession: (scoreResult, advanceDecision, nextLevel, levelChange = 'stay', levelMessage = '') =>
    set({ phase: 'result', scoreResult, advanceDecision, nextLevel, levelChange, levelMessage }),

  reset: () => set(initialState()),
}));
