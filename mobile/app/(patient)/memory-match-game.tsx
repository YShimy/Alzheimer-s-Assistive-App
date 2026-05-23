/**
 * Memory Match Game — Route
 * Associative Memory Matching: object-location paired-associate learning.
 * Inspired by Savulich et al. 2017.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMemoryMatchStore } from '@/src/features/games/memoryMatch/store';
import {
  buildSession, buildQuestions, computeScore, shouldAdvance,
  MEMORY_MATCH_LEVELS, clampLevel,
  type PlacedItem, type RecallQuestion,
} from '@/src/features/games/memoryMatch/engine';
import { gamesApi, spacedRetrievalApi } from '@/src/features/games/api';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────
const FEEDBACK_DURATION_MS = 1000;

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function MemoryMatchGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; reminderId?: string }>();
  const store = useMemoryMatchStore();

  // Start from param level or 1; will be overridden by backend-persisted level
  const [currentLevel, setCurrentLevel] = useState(clampLevel(parseInt(params.level ?? '1', 10) || 1));
  const [levelLoaded, setLevelLoaded] = useState(false);

  // Fetch persisted level from backend on mount
  useEffect(() => {
    store.reset();
    spacedRetrievalApi.getMemoryMatchLevel('me')
      .then((res) => {
        const savedLevel = clampLevel(res.level ?? 1);
        setCurrentLevel(savedLevel);
      })
      .catch(() => {
        // Use default (1 or param) if backend is unavailable
      })
      .finally(() => setLevelLoaded(true));
  }, []);

  if (!levelLoaded) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (store.phase === 'intro') {
    return <IntroScreen level={currentLevel} reminderId={params.reminderId} />;
  }
  if (store.phase === 'study') {
    return <StudyScreen />;
  }
  if (store.phase === 'delay') {
    return <DelayScreen />;
  }
  if (store.phase === 'recall') {
    return <RecallScreen />;
  }
  if (store.phase === 'result') {
    return (
      <ResultScreen
        onPlayAgain={() => {
          const decision = store.advanceDecision;
          let nextLevel = currentLevel;
          if (decision === 'advance') nextLevel = clampLevel(currentLevel + 1);
          else if (decision === 'regress') nextLevel = clampLevel(currentLevel - 1);
          // Persist the new level to the backend
          spacedRetrievalApi.setMemoryMatchLevel('me', nextLevel).catch(() => {});
          setCurrentLevel(nextLevel);
          store.reset();
        }}
        onExit={() => router.back()}
      />
    );
  }
  return null;
}

// ─── Intro Screen ─────────────────────────────────────────────────────────────
function IntroScreen({ level, reminderId }: { level: number; reminderId?: string }) {
  const { t } = useTranslation();
  const store = useMemoryMatchStore();
  const [loading, setLoading] = useState(false);
  const levelDef = MEMORY_MATCH_LEVELS.find(l => l.level === level)!;

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await gamesApi.startSession({ gameType: 'ASSOCIATIVE_MEMORY_MATCH', reminderId });
      const sessionId = res.session?.id ?? `local-${Date.now()}`;
      const layout = buildSession(level);
      const questions = buildQuestions(layout);
      store.startSession(level, layout, questions, sessionId);
    } catch {
      const layout = buildSession(level);
      const questions = buildQuestions(layout);
      store.startSession(level, layout, questions, `local-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.introContainer}>
        <View style={s.introIcon}>
          <Ionicons name="grid-outline" size={56} color={colors.primary[500]} />
        </View>
        <Text style={s.introTitle}>{t('memoryMatch.title', 'Memory Match')}</Text>
        <Text style={s.introSubtitle}>
          {t('memoryMatch.subtitle', 'Practice remembering which item belongs with which place.')}
        </Text>
        <View style={s.introBadge}>
          <Text style={s.introBadgeText}>{t('memoryMatch.level', { level })}</Text>
        </View>
        <View style={s.introInfoCard}>
          <InfoRow icon="grid-outline" label={t('memoryMatch.grid', 'Grid')} value={`${levelDef.gridRows} × ${levelDef.gridCols}`} />
          <InfoRow icon="shapes-outline" label={t('memoryMatch.itemsToRemember', 'Items to remember')} value={String(levelDef.itemCount)} />
          <InfoRow icon="time-outline" label={t('memoryMatch.studyTime', 'Study time')} value={t('memoryMatch.seconds', { count: levelDef.studyTimeSeconds })} />
          {levelDef.delaySeconds > 0 && (
            <InfoRow icon="hourglass-outline" label={t('memoryMatch.shortWait', 'Short wait before recall')} value={t('memoryMatch.seconds', { count: levelDef.delaySeconds })} />
          )}
        </View>
        <Text style={s.introHint}>
          {t('memoryMatch.hint', 'Look carefully at where each item is placed. You will be asked to find them afterwards.')}
        </Text>
        <TouchableOpacity style={s.startBtn} onPress={handleStart} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.startBtnText}>{t('memoryMatch.startPractice', 'Start Practice')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={18} color={colors.primary[400]} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Study Screen ─────────────────────────────────────────────────────────────
function StudyScreen() {
  const { t } = useTranslation();
  const store = useMemoryMatchStore();
  const layout = store.layout!;
  const level = layout.level;
  const [timeLeft, setTimeLeft] = useState(level.studyTimeSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          goNext();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const goNext = () => {
    if (level.delaySeconds > 0) {
      store.setPhase('delay');
    } else {
      store.setPhase('recall');
    }
  };

  const gridSize = level.gridRows * level.gridCols;
  const cells: (PlacedItem | null)[] = Array(gridSize).fill(null);
  layout.items.forEach(p => { cells[p.gridIndex] = p; });

  const progress = timeLeft / level.studyTimeSeconds;

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.studyHeader}>
        <Text style={s.studyHeaderText}>{t('memoryMatch.lookCarefully', "Look carefully at each item's position")}</Text>
        <View style={s.timerBar}>
          <View style={[s.timerFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={s.timerText}>{timeLeft}s</Text>
      </View>
      <View style={s.gridWrapper}>
        <ItemGrid cells={cells} gridCols={level.gridCols} />
      </View>
      <TouchableOpacity style={s.readyBtn} onPress={goNext} activeOpacity={0.85}>
        <Text style={s.readyBtnText}>{t('memoryMatch.imReady', "I'm ready")}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Delay Screen ─────────────────────────────────────────────────────────────
function DelayScreen() {
  const { t } = useTranslation();
  const store = useMemoryMatchStore();
  const delaySeconds = store.layout!.level.delaySeconds;
  const [timeLeft, setTimeLeft] = useState(delaySeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          store.setPhase('recall');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.delayContainer}>
        <Ionicons name="hourglass-outline" size={64} color={colors.primary[300]} />
        <Text style={s.delayTitle}>{t('memoryMatch.almostTime', 'Almost time…')}</Text>
        <Text style={s.delaySubtitle}>{t('memoryMatch.takeBreath', 'Take a breath. The recall will begin shortly.')}</Text>
        <Text style={s.delayTimer}>{timeLeft}</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Recall Screen ─────────────────────────────────────────────────────────────
function RecallScreen() {
  const { t } = useTranslation();
  const store = useMemoryMatchStore();
  const questions = store.questions;
  const currentIdx = store.currentQuestionIndex;
  const question = questions[currentIdx];
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [answered, setAnswered] = useState(false);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const showFeedback = (correct: boolean) => {
    setFeedback(correct ? 'correct' : 'incorrect');
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(FEEDBACK_DURATION_MS - 200),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setFeedback(null);
      setAnswered(false);
      if (currentIdx + 1 >= questions.length) {
        finishRecall();
      } else {
        store.nextQuestion();
      }
    });
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (answered) return;
    setAnswered(true);
    const responseTimeMs = Date.now() - store.questionStartTime;
    store.answerQuestion(isCorrect, responseTimeMs);
    showFeedback(isCorrect);
  };

  const finishRecall = () => {
    const total = questions.length;
    const correct = store.correctFirstTry;
    const incorrect = store.incorrectFirstTry;
    const result = computeScore(correct, incorrect, total, store.responseTimesMs);
    const decision = shouldAdvance(result.accuracyPercent, incorrect, total, true);
    store.finishSession(result, decision);
    // Submit to backend
    gamesApi.completeMemoryMatch(store.sessionId!, {
      score: result.score,
      accuracyPercent: result.accuracyPercent,
      levelStarted: store.level,
      levelCompleted: store.level,
      highestLevel: store.level,
      durationSeconds: Math.round((Date.now() - store.startedAt) / 1000),
      status: 'COMPLETED',
      itemResults: questions.map((q, i) => ({
        itemIndex: i,
        prompt: `Where was the ${q.targetItem.label}?`,
        correct: i < store.correctFirstTry,
        firstTryCorrect: i < store.correctFirstTry,
        correctAnswer: String(q.correctGridIndex),
        metadata: { objectId: q.targetItem.id, gridIndex: q.correctGridIndex },
      })),
    }).catch(() => {});
  };

  if (!question) return null;

  const gridSize = store.layout!.level.gridRows * store.layout!.level.gridCols;

  return (
    <SafeAreaView style={s.safeArea}>
      {/* Feedback overlay */}
      {feedback && (
        <Animated.View style={[s.feedbackOverlay, { opacity: feedbackAnim, backgroundColor: feedback === 'correct' ? colors.success.main + 'CC' : colors.warning.main + 'CC' }]}>
          <Text style={s.feedbackText}>{feedback === 'correct' ? t('memoryMatch.goodJob', '✓  Good job!') : t('memoryMatch.thatsOkay', "That's okay. Let's continue.")}</Text>
        </Animated.View>
      )}

      <View style={s.recallHeader}>
        <Text style={s.recallProgress}>{t('memoryMatch.progress', { current: currentIdx + 1, total: questions.length })}</Text>
        <Text style={s.recallPrompt}>
          {t('memoryMatch.whereWasPrompt', { item: question.targetItem.label, defaultValue: `Where was the ${question.targetItem.label}?` })}
        </Text>
        <View style={s.recallEmoji}>
          <Text style={s.targetEmoji}>{question.targetItem.emoji}</Text>
        </View>
      </View>

      <View style={s.gridWrapper}>
        <RecallGrid
          totalCells={gridSize}
          gridCols={store.layout!.level.gridCols}
          correctIndex={question.correctGridIndex}
          onSelect={handleAnswer}
          answered={answered}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ onPlayAgain, onExit }: { onPlayAgain: () => void; onExit: () => void }) {
  const { t } = useTranslation();
  const store = useMemoryMatchStore();
  const score = store.scoreResult!;
  const decision = store.advanceDecision!;

  const getMessage = () => {
    if (decision === 'advance') return t('memoryMatch.advanceMsg', "Great practice! You're ready for the next level.");
    if (decision === 'stay') return t('memoryMatch.stayMsg', "Nice effort! Let's practice this level again.");
    return t('memoryMatch.regressMsg', "We'll make the next round a little easier.");
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.resultContainer}>
        <View style={s.resultIcon}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.success.main} />
        </View>
        <Text style={s.resultTitle}>{t('memoryMatch.sessionComplete', 'Session Complete')}</Text>
        <Text style={s.resultMessage}>{getMessage()}</Text>

        <View style={s.resultCard}>
          <StatRow label={t('memoryMatch.itemsRecalled', 'Items recalled')} value={t('memoryMatch.recalledValue', { correct: store.correctFirstTry, total: store.questions.length })} />
          <StatRow label={t('memoryMatch.practiceScore', 'Practice score')} value={String(score.score)} />
          <StatRow label={t('memoryMatch.accuracy', 'Accuracy')} value={`${Math.round(score.accuracyPercent)}%`} />
          <StatRow label={t('memoryMatch.levelLabel', 'Level')} value={String(store.level)} />
        </View>

        <TouchableOpacity style={s.startBtn} onPress={onPlayAgain} activeOpacity={0.85}>
          <Text style={s.startBtnText}>{t('memoryMatch.practiceAgain', 'Practice Again')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.exitBtn} onPress={onExit} activeOpacity={0.85}>
          <Text style={s.exitBtnText}>{t('memoryMatch.done', 'Done')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// ─── Grid Components ──────────────────────────────────────────────────────────
function ItemGrid({ cells, gridCols }: { cells: (PlacedItem | null)[]; gridCols: number }) {
  const cellSize = Math.floor(300 / gridCols);
  return (
    <View style={[s.grid, { flexDirection: 'row', flexWrap: 'wrap', width: cellSize * gridCols }]}>
      {cells.map((cell, i) => (
        <View key={i} style={[s.gridCell, { width: cellSize, height: cellSize }]}>
          {cell && (
            <>
              <Text style={s.cellEmoji}>{cell.item.emoji}</Text>
              <Text style={s.cellLabel}>{cell.item.label}</Text>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

function RecallGrid({ totalCells, gridCols, correctIndex, onSelect, answered }: {
  totalCells: number; gridCols: number; correctIndex: number;
  onSelect: (isCorrect: boolean) => void; answered: boolean;
}) {
  const cellSize = Math.floor(300 / gridCols);
  return (
    <View style={[s.grid, { flexDirection: 'row', flexWrap: 'wrap', width: cellSize * gridCols }]}>
      {Array(totalCells).fill(null).map((_, i) => (
        <TouchableOpacity
          key={i}
          style={[s.gridCell, s.recallCell, { width: cellSize, height: cellSize }]}
          onPress={() => onSelect(i === correctIndex)}
          disabled={answered}
          activeOpacity={0.7}
        >
          <Text style={s.recallCellNum}>{i + 1}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background ?? '#f9f9f7' },
  introContainer: { padding: spacing.xl, alignItems: 'center', paddingBottom: 48 },
  introIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  introTitle: { fontSize: 28, fontWeight: '700', color: colors.neutral[800], marginBottom: spacing.sm },
  introSubtitle: { fontSize: 16, color: colors.neutral[500], textAlign: 'center', lineHeight: 24, marginBottom: spacing.lg },
  introBadge: { backgroundColor: colors.primary[100], paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: spacing.lg },
  introBadgeText: { color: colors.primary[700] ?? colors.primary[500], fontWeight: '600', fontSize: 14 },
  introInfoCard: { width: '100%', backgroundColor: colors.surface ?? '#f0f0ee', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  introHint: { fontSize: 14, color: colors.neutral[500], textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { flex: 1, fontSize: 14, color: colors.neutral[600] },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.neutral[800] },
  startBtn: { backgroundColor: colors.primary[500], paddingVertical: 16, paddingHorizontal: 40, borderRadius: radius.lg, alignItems: 'center', width: '100%', marginBottom: spacing.md },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  exitBtn: { paddingVertical: 14, alignItems: 'center', width: '100%' },
  exitBtnText: { fontSize: 16, color: colors.neutral[500] },
  studyHeader: { padding: spacing.lg, paddingBottom: spacing.sm },
  studyHeaderText: { fontSize: 16, color: colors.neutral[600], textAlign: 'center', marginBottom: spacing.md },
  timerBar: { height: 6, backgroundColor: colors.neutral[200], borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  timerFill: { height: '100%', backgroundColor: colors.primary[400], borderRadius: 3 },
  timerText: { fontSize: 13, color: colors.neutral[500], alignSelf: 'flex-end' },
  gridWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: {},
  gridCell: { borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.surface ?? '#f9f9f7', alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellEmoji: { fontSize: 28 },
  cellLabel: { fontSize: 10, color: colors.neutral[600], textAlign: 'center' },
  recallCell: { backgroundColor: colors.primary[50] },
  recallCellNum: { fontSize: 16, color: colors.primary[400], fontWeight: '600' },
  readyBtn: { margin: spacing.lg, backgroundColor: colors.secondary[500] ?? colors.primary[500], paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center' },
  readyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  delayContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  delayTitle: { fontSize: 24, fontWeight: '700', color: colors.neutral[700] },
  delaySubtitle: { fontSize: 15, color: colors.neutral[500], textAlign: 'center' },
  delayTimer: { fontSize: 56, fontWeight: '700', color: colors.primary[400] },
  feedbackOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 99, alignItems: 'center', justifyContent: 'center' },
  feedbackText: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', padding: 24 },
  recallHeader: { padding: spacing.lg, alignItems: 'center' },
  recallProgress: { fontSize: 13, color: colors.neutral[400], marginBottom: spacing.sm },
  recallPrompt: { fontSize: 20, color: colors.neutral[700], textAlign: 'center', marginBottom: spacing.md },
  recallItemName: { fontWeight: '700', color: colors.primary[600] ?? colors.primary[500] },
  recallEmoji: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  targetEmoji: { fontSize: 36 },
  resultContainer: { padding: spacing.xl, alignItems: 'center', paddingBottom: 48 },
  resultIcon: { marginBottom: spacing.lg },
  resultTitle: { fontSize: 26, fontWeight: '700', color: colors.neutral[800], marginBottom: spacing.sm },
  resultMessage: { fontSize: 16, color: colors.neutral[500], textAlign: 'center', lineHeight: 24, marginBottom: spacing.xl },
  resultCard: { width: '100%', backgroundColor: colors.surface ?? '#f0f0ee', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 15, color: colors.neutral[600] },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.neutral[800] },
});
