/**
 * GameBoard — Renders the grid for Safe Path Memory
 *
 * Visual rules:
 * - Start tile: highlighted blue
 * - End tile: highlighted green
 * - Bomb revealed: red with icon
 * - Visited safe: blue trail
 * - Current position: pulsing blue
 * - Unvisited: neutral
 */
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../../../infrastructure/theme/tokens';
import type { BoardDefinition, TileCoord } from '../engine/types';

const BOARD_PADDING_HORIZONTAL = spacing['2xl'] * 2;
const BOARD_PADDING_VERTICAL = 280; // Estimated HUD + Banner + Safe Area + Spacing
const TILE_GAP = 4;
const MAX_TILE_SIZE = 80;

interface GameBoardProps {
  board: BoardDefinition;
  path: TileCoord[];
  onTilePress: (coord: TileCoord) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

function coordKey(c: TileCoord): string {
  return `${c.row},${c.col}`;
}

export function GameBoard({ board, path, onTilePress, disabled = false, showPreview = false }: GameBoardProps) {
  const { width, height } = useWindowDimensions();

  // Calculate sizing based on available area to ensure it fits the screen
  const availableWidth = width - BOARD_PADDING_HORIZONTAL;
  const availableHeight = height - BOARD_PADDING_VERTICAL;

  const widthBasedTileSize = Math.floor((availableWidth - TILE_GAP * (board.cols - 1)) / board.cols);
  const heightBasedTileSize = Math.floor((availableHeight - TILE_GAP * (board.rows - 1)) / board.rows);

  const tileSize = Math.min(
    Math.max(widthBasedTileSize, 20),
    Math.max(heightBasedTileSize, 20),
    MAX_TILE_SIZE
  );

  const boardWidth = tileSize * board.cols + TILE_GAP * (board.cols - 1);

  const currentPos = path.length > 0 ? path[path.length - 1] : null;
  const visitedSet = new Set(path.map(coordKey));

  return (
    <View style={[styles.board, { width: boardWidth }]}>
      {board.tiles.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((tile, c) => {
            const isStart = tile.type === 'start';
            const isEnd = tile.type === 'end';
            const isBomb = tile.type === 'bomb';
            const isVisited = visitedSet.has(coordKey(tile.coord));
            const isCurrent = currentPos && currentPos.row === r && currentPos.col === c;
            const isRevealed = tile.revealed;
            const isExploded = tile.exploded;

            let tileStyle: any = styles.tileSafe;
            let iconName: any = null;
            let iconColor = '#fff';

            if (isStart) {
              tileStyle = isVisited ? styles.tileVisitedStart : styles.tileStart;
              iconName = 'flag-outline';
              iconColor = '#fff';
            } else if (isEnd) {
              tileStyle = styles.tileEnd;
              iconName = 'trophy-outline';
              iconColor = '#fff';
            } else if (isExploded) {
              tileStyle = styles.tileExploded;
              iconName = 'flash-outline';
              iconColor = '#fff';
            } else if (isBomb && isRevealed) {
              tileStyle = showPreview ? styles.tileBombPreview : styles.tileBombRevealed;
              iconName = showPreview ? 'warning-outline' : 'close-circle-outline';
              iconColor = '#fff';
            } else if (isVisited) {
              tileStyle = isCurrent ? styles.tileCurrent : styles.tileVisited;
            }

            return (
              <Pressable
                key={`${r}-${c}`}
                onPress={() => !disabled && onTilePress(tile.coord)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileSize, height: tileSize },
                  tileStyle,
                  pressed && !disabled && styles.tilePressed,
                  isCurrent && styles.tileCurrent,
                ]}
                accessibilityLabel={`Tile row ${r + 1} column ${c + 1}`}
                accessibilityRole="button"
              >
                {iconName && (
                  <Ionicons
                    name={iconName}
                    size={Math.min(tileSize * 0.45, 26)}
                    color={iconColor}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
    gap: TILE_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: TILE_GAP,
  },
  tile: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, // Base border for all tiles
  },
  tileSafe: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[400], // More distinct contrast (was 300)
    borderWidth: 1.5,
  },
  tileStart: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[700],
  },
  tileVisitedStart: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[600],
  },
  tileEnd: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.dark,
  },
  tileBombPreview: {
    backgroundColor: colors.error.main,
    borderColor: colors.error.dark,
    opacity: 0.85,
  },
  tileBombRevealed: {
    backgroundColor: colors.error.light,
    borderColor: colors.error.main,
    borderWidth: 1.5,
  },
  tileExploded: {
    backgroundColor: colors.error.main,
    borderColor: colors.error.dark,
  },
  tileVisited: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[400], // Increased contrast (was 300)
    borderWidth: 1.5,
  },
  tileCurrent: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[700], // Increased contrast (was 600)
    borderWidth: 2.5,
  },
  tilePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
