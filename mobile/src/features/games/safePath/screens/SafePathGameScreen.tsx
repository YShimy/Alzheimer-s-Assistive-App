/**
 * Safe Path Memory — Main Game Screen
 *
 * Orchestrates the full game lifecycle:
 * intro -> preview -> active -> success/fail -> summary
 *
 * Delegates all game logic to the Zustand store and engine.
 * Handles preview timers and event logging.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../../../../infrastructure/theme/tokens';
import { eventLogger } from '../../../../infrastructure/events/eventLogger';
import { EventNames } from '../../../../infrastructure/events/eventNames';
import { useSafePathStore } from '../store';
import { safePathApi } from '../api';
import { buildSessionResult } from '../engine/scoring';
import type { TileCoord, SessionResult, LevelResult } from '../engine/types';

import { GameBoard } from '../components/GameBoard';
import { GameHUD } from '../components/GameHUD';
import { InstructionsOverlay } from '../components/InstructionsOverlay';
import {
  LevelSuccessFeedback,
  LevelFailFeedback,
  SessionSummaryView,
  PauseOverlay,
} from '../components/Overlays';

export default function SafePathGameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const store = useSafePathStore();
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [lastLevelResult, setLastLevelResult] = useState<LevelResult | null>(null);

  // ─── Session Start ──────────────────────────────────────
  useEffect(() => {
    store.startSession();
    eventLogger.log({
      eventName: EventNames.GAME_OPENED,
      screenName: 'SafePathGameScreen',
      payload: { gameType: 'safe_path_memory' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Preview Timer ──────────────────────────────────────
  useEffect(() => {
    if (store.phase === 'preview' && store.board) {
      eventLogger.log({
        eventName: EventNames.LEVEL_PREVIEW_STARTED,
        screenName: 'SafePathGameScreen',
        payload: {
          gameType: 'safe_path_memory',
          levelIndex: store.levelIndex,
          difficultyTier: store.currentTier.tier,
          previewDurationMs: store.currentTier.previewDurationMs,
        },
      });

      previewTimerRef.current = setTimeout(() => {
        store.endPreview();
        eventLogger.log({
          eventName: EventNames.LEVEL_STARTED,
          screenName: 'SafePathGameScreen',
          payload: {
            gameType: 'safe_path_memory',
            levelIndex: store.levelIndex,
            difficultyTier: store.currentTier.tier,
            gridSize: `${store.currentTier.gridRows}x${store.currentTier.gridCols}`,
            bombCount: store.currentTier.bombCount,
          },
        });
      }, store.currentTier.previewDurationMs);
    }

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [store.phase, store.board?.start.row]); // re-run when a new board loads

  // ─── Tile Press Handler ─────────────────────────────────
  const handleTilePress = useCallback(
    (target: TileCoord) => {
      const outcome = store.makeMove(target);

      if (outcome.type === 'invalid') {
        eventLogger.log({
          eventName: EventNames.INVALID_MOVE_ATTEMPTED,
          screenName: 'SafePathGameScreen',
          payload: {
            gameType: 'safe_path_memory',
            reason: outcome.reason,
            levelIndex: store.levelIndex,
          },
        });
        return;
      }

      eventLogger.log({
        eventName: EventNames.TILE_SELECTED,
        screenName: 'SafePathGameScreen',
        payload: {
          gameType: 'safe_path_memory',
          tileRow: target.row,
          tileCol: target.col,
          result: outcome.type,
          levelIndex: store.levelIndex,
        },
      });

      if (outcome.type === 'end') {
        setLastLevelResult(outcome.levelResult);
        eventLogger.log({
          eventName: EventNames.LEVEL_COMPLETED,
          screenName: 'SafePathGameScreen',
          payload: {
            gameType: 'safe_path_memory',
            levelIndex: store.levelIndex,
            scoreDelta: outcome.levelResult.scoreDelta,
            solveTimeMs: outcome.levelResult.solveTimeMs,
            difficultyTier: outcome.levelResult.difficultyTier,
          },
        });
      }

      if (outcome.type === 'bomb') {
        setLastLevelResult(outcome.levelResult);
        eventLogger.log({
          eventName: EventNames.LEVEL_FAILED,
          screenName: 'SafePathGameScreen',
          payload: {
            gameType: 'safe_path_memory',
            levelIndex: store.levelIndex,
            difficultyTier: store.currentTier.tier,
            livesRemaining: store.lives,
          },
        });
      }
    },
    [store],
  );

  // ─── Action Handlers ────────────────────────────────────
  const handleStartFromIntro = () => {
    eventLogger.log({
      eventName: EventNames.GAME_SESSION_STARTED,
      screenName: 'SafePathGameScreen',
      payload: { gameType: 'safe_path_memory' },
    });
    store.startPreview();
  };

  const handleContinueAfterSuccess = () => {
    store.proceedAfterSuccess();
    store.startPreview();
  };

  const handleContinueAfterFail = () => {
    store.proceedAfterFail();
    // If lives run out, proceedAfterFail sets phase to session_summary
    const storeState = useSafePathStore.getState();
    if (storeState.phase !== 'session_summary') {
      store.startPreview();
    } else {
      finalizeSession(false);
    }
  };

  const handleEndSession = () => {
    finalizeSession(true);
  };

  const handlePause = () => {
    store.pauseGame();
    eventLogger.log({
      eventName: EventNames.SESSION_PAUSED,
      screenName: 'SafePathGameScreen',
      payload: { gameType: 'safe_path_memory', levelIndex: store.levelIndex },
    });
  };

  const handleResume = () => {
    store.resumeGame();
    eventLogger.log({
      eventName: EventNames.SESSION_RESUMED,
      screenName: 'SafePathGameScreen',
      payload: { gameType: 'safe_path_memory', levelIndex: store.levelIndex },
    });
  };

  const handleHelp = () => {
    if (store.phase === 'active') {
      store.pauseGame();
    }
    setShowInstructions(true);
    eventLogger.log({
      eventName: EventNames.GAME_INSTRUCTIONS_VIEWED,
      screenName: 'SafePathGameScreen',
      payload: { gameType: 'safe_path_memory', isReopen: true },
    });
  };

  const handleCloseHelp = () => {
    setShowInstructions(false);
    const storeState = useSafePathStore.getState();
    if (storeState.phase === 'paused') {
      store.resumeGame();
    }
  };

  const finalizeSession = (quitEarly: boolean) => {
    const result = store.endSession(quitEarly);
    setSessionResult(result);

    eventLogger.log({
      eventName: quitEarly ? EventNames.SESSION_ABANDONED : EventNames.SESSION_COMPLETED,
      screenName: 'SafePathGameScreen',
      payload: {
        gameType: 'safe_path_memory',
        totalScore: result.totalScore,
        highestTier: result.highestTierReached,
        levelsPlayed: result.levelsPlayed,
        durationSeconds: result.durationSeconds,
      },
    });

    // Save to backend (fire-and-forget with retry awareness)
    safePathApi.saveSession(result).catch((err) => {
      console.warn('Failed to save game session:', err);
      eventLogger.logError({
        screenName: 'SafePathGameScreen',
        errorCode: 'GAME_SESSION_SAVE_FAILED',
        actionAttempted: 'save_game_session',
        recoverable: true,
      });
    });
  };

  const handlePlayAgain = () => {
    setSessionResult(null);
    setLastLevelResult(null);
    store.startSession();
    store.startPreview();
  };

  const handleExit = () => {
    store.reset();
    router.back();
  };

  // ─── Preview Phase Label ────────────────────────────────
  const renderPreviewBanner = () => (
    <View style={styles.previewBanner}>
      <Text style={styles.previewText}>{t('games.safePath.previewBanner')}</Text>
    </View>
  );

  // ─── Active Phase Label ─────────────────────────────────
  const renderActiveBanner = () => (
    <View style={styles.activeBanner}>
      <Text style={styles.activeText}>{t('games.safePath.activeBanner')}</Text>
    </View>
  );

  // ─── Render ─────────────────────────────────────────────

  // Instructions overlay (initial or reopened)
  if (store.phase === 'intro' || showInstructions) {
    return (
      <InstructionsOverlay
        onStart={showInstructions ? handleCloseHelp : handleStartFromIntro}
        onClose={showInstructions ? handleCloseHelp : undefined}
        isReopen={showInstructions}
      />
    );
  }

  // Session summary
  if (store.phase === 'session_summary' && sessionResult) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SessionSummaryView
          result={sessionResult}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HUD */}
        <GameHUD
          levelIndex={store.levelIndex}
          tier={store.currentTier.tier}
          totalScore={store.totalScore}
          lives={store.lives}
          maxLives={store.maxLives}
          streak={store.currentStreak}
          onPause={handlePause}
          onHelp={handleHelp}
        />

        {/* Phase banner */}
        {store.phase === 'preview' && renderPreviewBanner()}
        {store.phase === 'active' && renderActiveBanner()}

        {/* Game Board */}
        {store.board && (
          <GameBoard
            board={store.board}
            path={store.path}
            onTilePress={handleTilePress}
            disabled={store.phase !== 'active'}
            showPreview={store.phase === 'preview'}
          />
        )}

        {/* Overlays */}
        {store.phase === 'level_success' && lastLevelResult && (
          <LevelSuccessFeedback
            levelResult={lastLevelResult}
            totalScore={store.totalScore}
            streak={store.currentStreak}
            onContinue={handleContinueAfterSuccess}
          />
        )}

        {store.phase === 'level_fail' && (
          <LevelFailFeedback
            lives={store.lives}
            onContinue={handleContinueAfterFail}
            onEndSession={handleEndSession}
          />
        )}

        {store.phase === 'paused' && !showInstructions && (
          <PauseOverlay
            onResume={handleResume}
            onHelp={handleHelp}
            onQuit={handleEndSession}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing['2xl'],
  },
  previewBanner: {
    backgroundColor: colors.warning.light,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  previewText: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.warning.dark,
  },
  activeBanner: {
    backgroundColor: colors.primary[50],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  activeText: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.primary[700],
  },
});
