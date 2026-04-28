/**
 * Safe Path Memory — Move Validation
 *
 * Pure functions for validating player moves on the board.
 * No state mutation — returns validation results.
 */
import type { TileCoord, BoardDefinition, MoveResult, GamePhase } from './types';
/**
 * Validate a move from the current position to a target tile.
 *
 * Rules:
 * - Must be in 'active' phase
 * - Target must be within bounds
 * - Target must be adjacent to current position
 * - Target must not have been visited already
 * - If target is a bomb, it's a valid move but results in explosion
 * - If target is end tile, player wins
 */
export declare function validateMove(board: BoardDefinition, currentPosition: TileCoord, target: TileCoord, visitedSet: Set<string>, phase: GamePhase): MoveResult;
//# sourceMappingURL=moveValidator.d.ts.map