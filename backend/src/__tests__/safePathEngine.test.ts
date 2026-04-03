/**
 * Safe Path Memory — Game Engine Tests
 *
 * Tests for board generation, move validation, scoring, and difficulty.
 * Run with: npx vitest run src/__tests__/safePathEngine.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  generateBoard,
  isBoardSolvable,
  coordKey,
} from '../../../mobile/src/features/games/safePath/engine/boardGenerator';
import { validateMove } from '../../../mobile/src/features/games/safePath/engine/moveValidator';
import {
  calculateLevelScore,
  buildSessionResult,
} from '../../../mobile/src/features/games/safePath/engine/scoring';
import {
  getTier,
  getNextTierOnSuccess,
  getNextTierOnFail,
  DIFFICULTY_LADDER,
  MAX_TIER,
  INITIAL_LIVES,
} from '../../../mobile/src/features/games/safePath/engine/difficulty';

// ─── Board Generation Tests ─────────────────────────────────

describe('Board Generation', () => {
  it('should generate a board with correct dimensions for each tier', () => {
    for (const tier of DIFFICULTY_LADDER) {
      const board = generateBoard(tier);
      expect(board.rows).toBe(tier.gridRows);
      expect(board.cols).toBe(tier.gridCols);
      expect(board.tiles.length).toBe(tier.gridRows);
      expect(board.tiles[0].length).toBe(tier.gridCols);
    }
  });

  it('should always have start on left column and end on right column', () => {
    for (let i = 0; i < 20; i++) {
      const board = generateBoard(getTier(1));
      expect(board.start.col).toBe(0);
      expect(board.end.col).toBe(board.cols - 1);
    }
  });

  it('should generate a solvable board every time (50 random boards)', () => {
    for (let i = 0; i < 50; i++) {
      const tier = getTier(Math.floor(Math.random() * MAX_TIER) + 1);
      const board = generateBoard(tier);
      const bombSet = new Set(board.bombCoords.map(coordKey));
      const solvable = isBoardSolvable(board.rows, board.cols, board.start, board.end, bombSet);
      expect(solvable).toBe(true);
    }
  });

  it('should place the correct number of bombs', () => {
    const tier = getTier(3);
    const board = generateBoard(tier);
    expect(board.bombCount).toBe(tier.bombCount);
    expect(board.bombCoords.length).toBe(tier.bombCount);
  });

  it('should not place bombs on start or end tiles', () => {
    for (let i = 0; i < 20; i++) {
      const board = generateBoard(getTier(5));
      const startKey = coordKey(board.start);
      const endKey = coordKey(board.end);
      for (const bc of board.bombCoords) {
        expect(coordKey(bc)).not.toBe(startKey);
        expect(coordKey(bc)).not.toBe(endKey);
      }
    }
  });

  it('should mark tile types correctly', () => {
    const board = generateBoard(getTier(1));
    expect(board.tiles[board.start.row][board.start.col].type).toBe('start');
    expect(board.tiles[board.end.row][board.end.col].type).toBe('end');
    board.bombCoords.forEach((bc) => {
      expect(board.tiles[bc.row][bc.col].type).toBe('bomb');
    });
  });
});

// ─── BFS Solvability Tests ──────────────────────────────────

describe('BFS Solvability', () => {
  it('should detect an unsolvable board', () => {
    const bombSet = new Set(['0,1', '1,1', '2,1', '3,1']);
    expect(isBoardSolvable(4, 4, { row: 0, col: 0 }, { row: 0, col: 3 }, bombSet)).toBe(false);
  });

  it('should detect a solvable board', () => {
    const bombSet = new Set(['1,1', '2,2']);
    expect(isBoardSolvable(4, 4, { row: 0, col: 0 }, { row: 3, col: 3 }, bombSet)).toBe(true);
  });

  it('should handle empty bomb set', () => {
    expect(isBoardSolvable(4, 4, { row: 0, col: 0 }, { row: 3, col: 3 }, new Set())).toBe(true);
  });
});

// ─── Move Validation Tests ──────────────────────────────────

describe('Move Validation', () => {
  it('should reject moves when not in active phase', () => {
    const board = generateBoard(getTier(1));
    const result = validateMove(board, board.start, { row: 0, col: 1 }, new Set(), 'preview');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('game_not_active');
  });

  it('should reject out-of-bounds moves', () => {
    const board = generateBoard(getTier(1));
    const result = validateMove(board, board.start, { row: -1, col: 0 }, new Set(), 'active');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('out_of_bounds');
  });

  it('should reject non-adjacent moves', () => {
    const board = generateBoard(getTier(1));
    const result = validateMove(
      board, board.start,
      { row: board.start.row, col: board.start.col + 2 },
      new Set(), 'active',
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('not_adjacent');
  });

  it('should reject already-visited tiles', () => {
    const board = generateBoard(getTier(1));
    const target = { row: board.start.row, col: 1 };
    const visited = new Set([coordKey(target)]);
    const result = validateMove(board, board.start, target, visited, 'active');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('already_visited');
  });
});

// ─── Scoring Tests ──────────────────────────────────────────

describe('Scoring', () => {
  it('should return 0 for failed levels', () => {
    expect(calculateLevelScore(getTier(1), 5000, false, 0)).toBe(0);
  });

  it('should calculate positive score for successful levels', () => {
    expect(calculateLevelScore(getTier(1), 5000, true, 0)).toBeGreaterThan(0);
  });

  it('should award higher score for faster completion', () => {
    const tier = getTier(3);
    expect(calculateLevelScore(tier, 2000, true, 0)).toBeGreaterThan(
      calculateLevelScore(tier, 12000, true, 0),
    );
  });

  it('should award 25-point clean bonus when no retries', () => {
    const tier = getTier(1);
    const cleanScore = calculateLevelScore(tier, 5000, true, 0);
    const retryScore = calculateLevelScore(tier, 5000, true, 1);
    expect(cleanScore).toBe(retryScore + 25);
  });

  it('should increase base score with higher tiers', () => {
    const score1 = calculateLevelScore(getTier(1), getTier(1).targetSolveTimeMs, true, 0);
    const score5 = calculateLevelScore(getTier(5), getTier(5).targetSolveTimeMs, true, 0);
    expect(score5).toBeGreaterThan(score1);
  });
});

// ─── Session Result Builder Tests ───────────────────────────

describe('Session Result Builder', () => {
  it('should build a valid session result', () => {
    const result = buildSessionResult(
      [
        { levelIndex: 0, difficultyTier: 1, gridRows: 4, gridCols: 4, bombCount: 3,
          previewDurationMs: 3500, solveTimeMs: 5000, success: true, scoreDelta: 200,
          pathLength: 7, retryCount: 0, startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString() },
        { levelIndex: 1, difficultyTier: 2, gridRows: 4, gridCols: 4, bombCount: 4,
          previewDurationMs: 3200, solveTimeMs: 8000, success: false, scoreDelta: 0,
          pathLength: 3, retryCount: 0, startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString() },
      ],
      Date.now() - 30000, false, 2, 1,
    );
    expect(result.gameType).toBe('safe_path_memory');
    expect(result.totalScore).toBe(200);
    expect(result.levelsPlayed).toBe(2);
    expect(result.levelsSucceeded).toBe(1);
    expect(result.levelsFailed).toBe(1);
    expect(result.highestTierReached).toBe(2);
    expect(result.quitEarly).toBe(false);
    expect(result.bestLevelScore).toBe(200);
  });
});

// ─── Difficulty Progression Tests ───────────────────────────

describe('Difficulty Progression', () => {
  it('should have 8 tiers', () => {
    expect(DIFFICULTY_LADDER.length).toBe(8);
  });

  it('should advance tier on success, capped at max', () => {
    expect(getNextTierOnSuccess(1)).toBe(2);
    expect(getNextTierOnSuccess(5)).toBe(6);
    expect(getNextTierOnSuccess(8)).toBe(8);
  });

  it('should step down tier on fail, min 1', () => {
    expect(getNextTierOnFail(3)).toBe(2);
    expect(getNextTierOnFail(1)).toBe(1);
  });

  it('should have increasing difficulty across tiers', () => {
    for (let i = 1; i < DIFFICULTY_LADDER.length; i++) {
      const prev = DIFFICULTY_LADDER[i - 1];
      const curr = DIFFICULTY_LADDER[i];
      const prevD = prev.gridRows * prev.gridCols + prev.bombCount;
      const currD = curr.gridRows * curr.gridCols + curr.bombCount;
      expect(currD).toBeGreaterThanOrEqual(prevD);
    }
  });
});
