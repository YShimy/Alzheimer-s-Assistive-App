/**
 * Safe Path Memory — Core Type Definitions
 *
 * All game state types are defined here for engine purity.
 * No React or UI imports allowed in this file.
 */
export interface TileCoord {
    row: number;
    col: number;
}
export type TileType = 'safe' | 'bomb' | 'start' | 'end';
export interface TileState {
    coord: TileCoord;
    type: TileType;
    revealed: boolean;
    visited: boolean;
    exploded: boolean;
}
export interface BoardDefinition {
    rows: number;
    cols: number;
    tiles: TileState[][];
    start: TileCoord;
    end: TileCoord;
    bombCoords: TileCoord[];
    bombCount: number;
}
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
export type GamePhase = 'intro' | 'preview' | 'active' | 'paused' | 'level_success' | 'level_fail' | 'session_summary';
export type MoveResult = {
    valid: true;
    type: 'safe';
} | {
    valid: true;
    type: 'end';
    won: true;
} | {
    valid: true;
    type: 'bomb';
    exploded: true;
} | {
    valid: false;
    reason: 'not_adjacent' | 'already_visited' | 'out_of_bounds' | 'game_not_active';
};
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
    levelHistory: LevelRecord[];
    retryCountThisLevel: number;
    supportMode: boolean;
    supportConfigApplied: boolean;
}
//# sourceMappingURL=types.d.ts.map