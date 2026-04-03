/**
 * Safe Path Memory — Board Generation
 *
 * Pure functions for generating solvable game boards.
 * Strategy: Generate a guaranteed safe path first, then place bombs around it.
 * This guarantees solvability without retry loops.
 */
import type { TileCoord, TileState, BoardDefinition, DifficultyTier } from './types';

// ─── Helpers ───────────────────────────────────────────────

function coordKey(c: TileCoord): string {
  return `${c.row},${c.col}`;
}

function isAdjacent(a: TileCoord, b: TileCoord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/**
 * Shuffle an array in-place (Fisher-Yates).
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Path Generation ───────────────────────────────────────

/**
 * Pick start and end positions on opposite edges of the grid.
 * Start is on the left column, end is on the right column.
 */
function pickStartEnd(rows: number, cols: number): { start: TileCoord; end: TileCoord } {
  const startRow = Math.floor(Math.random() * rows);
  const endRow = Math.floor(Math.random() * rows);
  return {
    start: { row: startRow, col: 0 },
    end: { row: endRow, col: cols - 1 },
  };
}

/**
 * Generate a random walk from start to end using a DFS-like approach.
 * This produces a guaranteed path that the player can follow.
 */
function generateSafePath(rows: number, cols: number, start: TileCoord, end: TileCoord): TileCoord[] {
  const visited = new Set<string>();
  const path: TileCoord[] = [];

  function getNeighbors(c: TileCoord): TileCoord[] {
    const dirs = [
      { row: c.row - 1, col: c.col },
      { row: c.row + 1, col: c.col },
      { row: c.row, col: c.col - 1 },
      { row: c.row, col: c.col + 1 },
    ];
    return dirs.filter(
      (d) => d.row >= 0 && d.row < rows && d.col >= 0 && d.col < cols && !visited.has(coordKey(d)),
    );
  }

  function dfs(current: TileCoord): boolean {
    visited.add(coordKey(current));
    path.push(current);

    if (current.row === end.row && current.col === end.col) {
      return true;
    }

    // Shuffle neighbors for randomness
    const neighbors = shuffle(getNeighbors(current));
    for (const n of neighbors) {
      if (dfs(n)) return true;
    }

    // Backtrack
    path.pop();
    return false;
  }

  dfs(start);
  return path;
}

// ─── BFS Solvability Check ─────────────────────────────────

/**
 * Verify that at least one safe path exists from start to end.
 * Used as a safety check after bomb placement.
 */
export function isBoardSolvable(
  rows: number,
  cols: number,
  start: TileCoord,
  end: TileCoord,
  bombSet: Set<string>,
): boolean {
  const visited = new Set<string>();
  const queue: TileCoord[] = [start];
  visited.add(coordKey(start));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === end.row && current.col === end.col) return true;

    const neighbors: TileCoord[] = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ];

    for (const n of neighbors) {
      const key = coordKey(n);
      if (
        n.row >= 0 &&
        n.row < rows &&
        n.col >= 0 &&
        n.col < cols &&
        !visited.has(key) &&
        !bombSet.has(key)
      ) {
        visited.add(key);
        queue.push(n);
      }
    }
  }

  return false;
}

// ─── Board Generation ──────────────────────────────────────

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
export function generateBoard(tier: DifficultyTier): BoardDefinition {
  const { gridRows: rows, gridCols: cols, bombCount } = tier;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { start, end } = pickStartEnd(rows, cols);
    const safePath = generateSafePath(rows, cols, start, end);

    if (safePath.length === 0) continue; // DFS failed to find path (shouldn't happen)

    const safePathSet = new Set(safePath.map(coordKey));

    // Collect all non-path, non-start, non-end tiles as bomb candidates
    const bombCandidates: TileCoord[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = coordKey({ row: r, col: c });
        if (!safePathSet.has(key)) {
          bombCandidates.push({ row: r, col: c });
        }
      }
    }

    // Ensure we don't try to place more bombs than available candidate tiles
    const actualBombCount = Math.min(bombCount, bombCandidates.length);
    const shuffledCandidates = shuffle([...bombCandidates]);
    const bombCoords = shuffledCandidates.slice(0, actualBombCount);
    const bombSet = new Set(bombCoords.map(coordKey));

    // Safety BFS check
    if (!isBoardSolvable(rows, cols, start, end, bombSet)) {
      continue;
    }

    // Build tile grid
    const tiles: TileState[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: TileState[] = [];
      for (let c = 0; c < cols; c++) {
        const coord: TileCoord = { row: r, col: c };
        const key = coordKey(coord);
        let type: TileState['type'] = 'safe';
        if (key === coordKey(start)) type = 'start';
        else if (key === coordKey(end)) type = 'end';
        else if (bombSet.has(key)) type = 'bomb';

        row.push({
          coord,
          type,
          revealed: false,
          visited: false,
          exploded: false,
        });
      }
      tiles.push(row);
    }

    return { rows, cols, tiles, start, end, bombCoords, bombCount: actualBombCount };
  }

  // Fallback: create a trivial board with no bombs (extremely unlikely to reach here)
  const { start, end } = pickStartEnd(rows, cols);
  const tiles: TileState[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TileState[] = [];
    for (let c = 0; c < cols; c++) {
      const coord: TileCoord = { row: r, col: c };
      let type: TileState['type'] = 'safe';
      if (coordKey(coord) === coordKey(start)) type = 'start';
      else if (coordKey(coord) === coordKey(end)) type = 'end';
      row.push({ coord, type, revealed: false, visited: false, exploded: false });
    }
    tiles.push(row);
  }
  return { rows, cols, tiles, start, end, bombCoords: [], bombCount: 0 };
}

// Re-export helpers for testing
export { isAdjacent, coordKey };
