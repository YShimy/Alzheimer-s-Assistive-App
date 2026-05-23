/**
 * Spaced Retrieval session store (Zustand).
 */
import { create } from 'zustand';
import type { PracticeQuestion, SessionScore } from './engine';

export type SRPhase = 'intro' | 'question' | 'feedback' | 'result';

interface AnswerLog {
  correct: boolean;
  usedCue: boolean;
  unsure: boolean;
  item?: any;
  isContactQuestion?: boolean;
  contactId?: string | null;
}

interface SRState {
  phase: SRPhase;
  questions: PracticeQuestion[];
  currentQuestionIndex: number;
  results: AnswerLog[];
  sessionId: string | null;
  startedAt: number;
  score: SessionScore | null;

  startSession: (questions: PracticeQuestion[], sessionId: string) => void;
  setPhase: (phase: SRPhase) => void;
  answer: (correct: boolean, usedCue: boolean, unsure: boolean, item?: any, isContactQuestion?: boolean, contactId?: string | null) => void;
  nextQuestion: () => void;
  finish: (score: SessionScore) => void;
  reset: () => void;
}

function initialState(): Omit<SRState, keyof { startSession: any; setPhase: any; answer: any; nextQuestion: any; finish: any; reset: any }> {
  return {
    phase: 'intro',
    questions: [],
    currentQuestionIndex: 0,
    results: [],
    sessionId: null,
    startedAt: 0,
    score: null,
  };
}

export const useSpacedRetrievalStore = create<SRState>((set) => ({
  ...initialState(),

  startSession: (questions, sessionId) =>
    set({
      questions,
      sessionId,
      phase: 'question',
      currentQuestionIndex: 0,
      results: [],
      score: null,
      startedAt: Date.now(),
    }),

  setPhase: (phase) => set({ phase }),

  answer: (correct, usedCue, unsure, item, isContactQuestion, contactId) =>
    set((state) => ({
      results: [...state.results, { correct, usedCue, unsure, item, isContactQuestion, contactId }],
    })),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
      phase: 'question',
    })),

  finish: (score) => set({ phase: 'result', score }),

  reset: () => set(initialState()),
}));

