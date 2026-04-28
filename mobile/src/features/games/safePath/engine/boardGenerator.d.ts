/**
 * Safe Path Memory — Board Generation
 *
 * Pure functions for generating solvable game boards.
 * Strategy: Generate a guaranteed safe path first, then place bombs around it.
 * This guarantees solvability without retry loops.
 */
import type { TileCoord, BoardDefinition, DifficultyTier } from './types';
declare function coordKey(c: TileCoord): string;
declare function isAdjacent(a: TileCoord, b: TileCoord): boolean;
/**
 * Verify that at least one safe path exists from start to end.
 * Used as a safety check after bomb placement.
 */
export declare function isBoardSolvable(rows: number, cols: number, start: TileCoord, end: TileCoord, bombSet: Set<string>): boolean;
/**
 * Generate a solvable game board.
 *
 * Strategy:
 * 1. Pick start/end on opposite edges
 * 2. Generate a guaranteed safe path via DFS
 * 3. Place bombs randomly on tiles NOT on the safe path (and not start/end)
 * 4. BFS verify solvability as a safety net
 * 5. If somehow unsolvable (shouldn't happen), regenerate
 */
export declare function generateBoard(tier: DifficultyTier): BoardDefinition;
export { isAdjacent, coordKey };
//# sourceMappingURL=boardGenerator.d.ts.map