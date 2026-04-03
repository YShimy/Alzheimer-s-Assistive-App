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
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../../../infrastructure/theme/tokens';
import type { BoardDefinition, TileCoord, TileState } from '../engine/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_PADDING = spacing['2xl'] * 2;
const TILE_GAP = 3;

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
  const availableWidth = SCREEN_WIDTH - BOARD_PADDING;
  const tileSize = Math.floor((availableWidth - TILE_GAP * (board.cols - 1)) / board.cols);
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

            let tileStyle = styles.tileSafe;
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
  },
  tileSafe: {
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  tileStart: {
    backgroundColor: colors.primary[500],
  },
  tileVisitedStart: {
    backgroundColor: colors.primary[400],
  },
  tileEnd: {
    backgroundColor: colors.success.main,
  },
  tileBombPreview: {
    backgroundColor: colors.error.main,
    opacity: 0.85,
  },
  tileBombRevealed: {
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  tileExploded: {
    backgroundColor: colors.error.main,
  },
  tileVisited: {
    backgroundColor: colors.primary[100],
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  tileCurrent: {
    backgroundColor: colors.primary[400],
    borderWidth: 2,
    borderColor: colors.primary[600],
  },
  tilePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
