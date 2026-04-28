"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMove = validateMove;
const boardGenerator_1 = require("./boardGenerator");
/**
 * Check if two tiles are orthogonally adjacent.
 */
function isAdjacent(a, b) {
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
function validateMove(board, currentPosition, target, visitedSet, phase) {
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
    if (visitedSet.has((0, boardGenerator_1.coordKey)(target))) {
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
//# sourceMappingURL=moveValidator.js.map