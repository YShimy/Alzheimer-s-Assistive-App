/**
 * Safe Path Memory — Move Validation
 *
 * Pure functions for validating player moves on the board.
 * No state mutation — returns validation results.
 */
import type { TileCoord, BoardDefinition, MoveResult, GamePhase } from './types';
import { coordKey } from './boardGenerator';

/**
 * Check if two tiles are orthogonally adjacent.
 */
function isAdjacent(a: TileCoord, b: TileCoord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

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
export function validateMove(
  board: BoardDefinition,
  currentPosition: TileCoord,
  target: TileCoord,
  visitedSet: Set<string>,
  phase: GamePhase,
): MoveResult {
  // Phase check
  if (phase !== 'active') {
    return { valid: false, reason: 'game_not_active' };
  }

  // Bounds check
  if (target.row < 0 || target.row >= board.rows || target.col < 0 || target.col >= board.cols) {
    return { valid: false, reason: 'out_of_bounds' };
  }

  // Adjacency check
  if (!isAdjacent(currentPosition, target)) {
    return { valid: false, reason: 'not_adjacent' };
  }

  // Already visited check
  if (visitedSet.has(coordKey(target))) {
    return { valid: false, reason: 'already_visited' };
  }

  // Get tile type
  const tile = board.tiles[target.row][target.col];

  // Bomb check
  if (tile.type === 'bomb') {
    return { valid: true, type: 'bomb', exploded: true };
  }

  // End tile check
  if (tile.type === 'end') {
    return { valid: true, type: 'end', won: true };
  }

  // Safe tile
  return { valid: true, type: 'safe' };
}
