/**
 * Safe Path Memory — Game State Manager (Zustand)
 *
 * Manages the full game lifecycle: intro -> preview -> active -> result -> summary.
 * Uses pure engine functions for all game logic.
 */
import { create } from 'zustand';
import type { GameState, GamePhase, TileCoord, LevelResult, SessionResult } from './engine/types';
import { generateBoard, coordKey, validateMove } from './engine';
import { 
  getTier, 
  INITIAL_LIVES, 
  decideNextTier, 
  getSupportConfig,
  type LevelRecord,
  type LevelOutcome 
} from './engine/difficulty';
import { calculateLevelScore, buildSessionResult, determineLevelOutcome } from './engine/scoring';

interface SafePathStore extends GameState {
  // Actions
  startSession: () => void;
  startPreview: () => void;
  endPreview: () => void;
  makeMove: (target: TileCoord) => MoveOutcome;
  pauseGame: () => void;
  resumeGame: () => void;
  proceedAfterSuccess: () => void;
  proceedAfterFail: () => void;
  endSession: (quitEarly: boolean) => SessionResult;
  reset: () => void;
}

type MoveOutcome =
  | { type: 'safe' }
  | { type: 'end'; levelResult: LevelResult }
  | { type: 'bomb'; levelResult: LevelResult }
  | { type: 'invalid'; reason: string };

function createInitialState(): GameState {
  return {
    phase: 'intro',
    currentTier: getTier(0), // Start at Tutorial 0
    board: null,
    path: [],
    levelIndex: 0,
    totalScore: 0,
    highestTierReached: 0,
    lives: INITIAL_LIVES,
    maxLives: INITIAL_LIVES,
    currentStreak: 0,
    longestStreak: 0,
    levelStartTime: null,
    sessionStartTime: Date.now(),
    levelResults: [],
    levelHistory: [], // Track last 3 for progression
    retryCountThisLevel: 0,
    supportMode: false,
    supportConfigApplied: false,
  };
}

export const useSafePathStore = create<SafePathStore>((set, get) => ({
  ...createInitialState(),

  startSession: () => {
    set({
      ...createInitialState(),
      phase: 'intro',
      sessionStartTime: Date.now(),
    });
  },

  startPreview: () => {
    const state = get();
    const supportConfig = state.supportMode ? getSupportConfig() : null;
    const previewDuration = state.currentTier.previewDurationMs + (supportConfig?.previewBonusMs || 0);
    
    const board = generateBoard(state.currentTier);
    
    // Mark bombs as revealed during preview (except Tutorial 0 which has no preview phase)
    if (state.currentTier.tier > 0) {
      for (const bc of board.bombCoords) {
        board.tiles[bc.row][bc.col].revealed = true;
      }
    }
    // Mark start as visited
    board.tiles[board.start.row][board.start.col].visited = true;

    set({
      phase: 'preview',
      board,
      path: [board.start],
      levelStartTime: null,
      supportConfigApplied: state.supportMode,
    });
  },

  endPreview: () => {
    const state = get();
    if (!state.board) return;

    // Hide bombs
    const board = { ...state.board };
    const tiles = board.tiles.map((row) =>
      row.map((tile) => ({
        ...tile,
        revealed: tile.type === 'start' || tile.type === 'end' ? tile.revealed : false,
      })),
    );
    board.tiles = tiles;

    set({
      phase: 'active',
      board,
      levelStartTime: Date.now(),
    });
  },

  makeMove: (target: TileCoord): MoveOutcome => {
    const state = get();
    if (!state.board || state.phase !== 'active') {
      return { type: 'invalid', reason: 'game_not_active' };
    }

    const currentPos = state.path[state.path.length - 1];
    const visitedSet = new Set(state.path.map(coordKey));
    const result = validateMove(state.board, currentPos, target, visitedSet, state.phase);

    if (!result.valid) {
      return { type: 'invalid', reason: result.reason };
    }

    // Mark tile as visited
    const board = { ...state.board };
    const tiles = board.tiles.map((row) => row.map((tile) => ({ ...tile })));
    tiles[target.row][target.col].visited = true;
    board.tiles = tiles;

    const newPath = [...state.path, target];

    if (result.type === 'bomb') {
      // Explosion
      tiles[target.row][target.col].exploded = true;
      tiles[target.row][target.col].revealed = true;
      // Reveal all bombs on failure
      for (const bc of board.bombCoords) {
        tiles[bc.row][bc.col].revealed = true;
      }

      const solveTimeMs = state.levelStartTime ? Date.now() - state.levelStartTime : 0;
      const outcome: LevelOutcome = 'fail';
      const scoreDelta = calculateLevelScore(state.currentTier, solveTimeMs, outcome, state.retryCountThisLevel, state.supportMode);
      
      const levelResult: LevelResult = {
        levelIndex: state.levelIndex,
        difficultyTier: state.currentTier.tier,
        gridRows: state.currentTier.gridRows,
        gridCols: state.currentTier.gridCols,
        bombCount: state.currentTier.bombCount,
        previewDurationMs: state.currentTier.previewDurationMs,
        solveTimeMs,
        success: false,
        outcome,
        scoreDelta,
        pathLength: newPath.length,
        retryCount: state.retryCountThisLevel,
        supportMode: state.supportMode,
        startedAt: state.levelStartTime ? new Date(state.levelStartTime).toISOString() : new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      
      // Update history for progression
      const newHistory: LevelRecord[] = [...state.levelHistory, { 
        tier: state.currentTier.tier, 
        outcome, 
        timestamp: Date.now() 
      }].slice(-3);

      set({
        board,
        path: newPath,
        phase: 'level_fail',
        lives: state.lives - 1,
        levelResults: [...state.levelResults, levelResult],
        levelHistory: newHistory,
        currentStreak: 0, // Reset streak on fail
      });

      return { type: 'bomb', levelResult };
    }

    if (result.type === 'end') {
      // Won the level
      const solveTimeMs = state.levelStartTime ? Date.now() - state.levelStartTime : 0;
      const isFirstTry = state.retryCountThisLevel === 0;
      const outcome = determineLevelOutcome(true, isFirstTry, state.supportMode);
      const scoreDelta = calculateLevelScore(state.currentTier, solveTimeMs, outcome, state.retryCountThisLevel, state.supportMode);
      
      const newStreak = state.currentStreak + 1;
      const levelResult: LevelResult = {
        levelIndex: state.levelIndex,
        difficultyTier: state.currentTier.tier,
        gridRows: state.currentTier.gridRows,
        gridCols: state.currentTier.gridCols,
        bombCount: state.currentTier.bombCount,
        previewDurationMs: state.currentTier.previewDurationMs,
        solveTimeMs,
        success: true,
        outcome,
        scoreDelta,
        pathLength: newPath.length,
        retryCount: state.retryCountThisLevel,
        supportMode: state.supportMode,
        startedAt: state.levelStartTime ? new Date(state.levelStartTime).toISOString() : new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      
      // Update history for progression
      const newHistory: LevelRecord[] = [...state.levelHistory, { 
        tier: state.currentTier.tier, 
        outcome, 
        timestamp: Date.now() 
      }].slice(-3);

      set({
        board,
        path: newPath,
        phase: 'level_success',
        totalScore: state.totalScore + scoreDelta,
        currentStreak: newStreak,
        longestStreak: Math.max(state.longestStreak, newStreak),
        highestTierReached: Math.max(state.highestTierReached, state.currentTier.tier),
        levelResults: [...state.levelResults, levelResult],
        levelHistory: newHistory,
      });

      return { type: 'end', levelResult };
    }

    // Safe tile
    set({ board, path: newPath });
    return { type: 'safe' };
  },

  pauseGame: () => {
    if (get().phase === 'active') {
      set({ phase: 'paused' });
    }
  },

  resumeGame: () => {
    if (get().phase === 'paused') {
      set({ phase: 'active' });
    }
  },

  proceedAfterSuccess: () => {
    const state = get();
    const lastResult = state.levelResults[state.levelResults.length - 1];
    const outcome: LevelOutcome = lastResult?.supportMode ? 'supported_clear' : 'strong_clear';
    
    const decision = decideNextTier(
      state.currentTier.tier,
      outcome,
      state.levelHistory.slice(0, -1), // Exclude current since already added
      state.retryCountThisLevel > 0
    );
    
    set({
      currentTier: getTier(decision.nextTier),
      levelIndex: state.levelIndex + 1,
      retryCountThisLevel: 0,
      supportMode: decision.supportMode,
    });
  },

  proceedAfterFail: () => {
    const state = get();
    if (state.lives <= 0) {
      // Session over — build summary
      set({ phase: 'session_summary' });
      return;
    }
    
    const decision = decideNextTier(
      state.currentTier.tier,
      'fail',
      state.levelHistory.slice(0, -1),
      state.retryCountThisLevel > 0
    );
    
    set({
      currentTier: getTier(decision.nextTier),
      levelIndex: state.levelIndex + 1,
      retryCountThisLevel: state.retryCountThisLevel + 1,
      currentStreak: 0,
      supportMode: decision.supportMode,
    });
  },

  endSession: (quitEarly: boolean): SessionResult => {
    const state = get();
    const result = buildSessionResult(
      state.levelResults,
      state.sessionStartTime,
      quitEarly,
      state.highestTierReached,
      state.longestStreak,
    );
    set({ phase: 'session_summary' });
    return result;
  },

  reset: () => {
    set(createInitialState());
  },
}));
