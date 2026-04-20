/**
 * Safe Path Memory — Core Type Definitions
 *
 * All game state types are defined here for engine purity.
 * No React or UI imports allowed in this file.
 */

// ─── Coordinates & Tiles ───────────────────────────────────

export interface TileCoord {
  row: number;
  col: number;
}

export type TileType = 'safe' | 'bomb' | 'start' | 'end';

export interface TileState {
  coord: TileCoord;
  type: TileType;
  revealed: boolean;     // bomb visibility during preview
  visited: boolean;      // player has stepped on this tile
  exploded: boolean;     // player stepped on a bomb
}

// ─── Board ─────────────────────────────────────────────────

export interface BoardDefinition {
  rows: number;
  cols: number;
  tiles: TileState[][];
  start: TileCoord;
  end: TileCoord;
  bombCoords: TileCoord[];
  bombCount: number;
}

// ─── Difficulty ────────────────────────────────────────────

export type BranchingLevel = 'none' | 'low' | 'moderate' | 'moderate-high';

export interface DifficultyTier {
  tier: number;
  gridRows: number;
  gridCols: number;
  bombCount: number;
  previewDurationMs: number;
  targetSolveTimeMs: number;
  pathMinLength?: number;
  branching?: BranchingLevel;
}

// ─── Game Phase State Machine ──────────────────────────────

export type GamePhase =
  | 'intro'
  | 'preview'
  | 'active'
  | 'paused'
  | 'level_success'
  | 'level_fail'
  | 'session_summary';

// ─── Move Validation ───────────────────────────────────────

export type MoveResult =
  | { valid: true; type: 'safe' }
  | { valid: true; type: 'end'; won: true }
  | { valid: true; type: 'bomb'; exploded: true }
  | { valid: false; reason: 'not_adjacent' | 'already_visited' | 'out_of_bounds' | 'game_not_active' };

// ─── Level Result ──────────────────────────────────────────

export type LevelOutcome = 'strong_clear' | 'supported_clear' | 'fail';

export interface LevelResult {
  levelIndex: number;
  difficultyTier: number;
  gridRows: number;
  gridCols: number;
  bombCount: number;
  previewDurationMs: number;
  solveTimeMs: number;
  success: boolean;
  outcome: LevelOutcome;
  scoreDelta: number;
  pathLength: number;
  retryCount: number;
  supportMode: boolean;
  startedAt: string;
  completedAt: string;
}

// ─── Session Result ────────────────────────────────────────

export interface SessionResult {
  gameType: 'safe_path_memory';
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  totalScore: number;
  highestTierReached: number;
  levelsPlayed: number;
  levelsSucceeded: number;
  levelsFailed: number;
  quitEarly: boolean;
  bestLevelScore: number;
  averageSolveTimeMs: number;
  longestStreak: number;
  levelResults: LevelResult[];
}

// ─── Game State ────────────────────────────────────────────

export interface LevelRecord {
  tier: number;
  outcome: LevelOutcome;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  currentTier: DifficultyTier;
  board: BoardDefinition | null;
  path: TileCoord[];
  levelIndex: number;
  totalScore: number;
  highestTierReached: number;
  lives: number;
  maxLives: number;
  currentStreak: number;
  longestStreak: number;
  levelStartTime: number | null;
  sessionStartTime: number;
  levelResults: LevelResult[];
  levelHistory: LevelRecord[]; // Track last 3 for progression
  retryCountThisLevel: number;
  supportMode: boolean; // Current level in support mode
  supportConfigApplied: boolean; // Whether support adjustments are active
}
