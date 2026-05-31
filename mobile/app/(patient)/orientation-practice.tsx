/**
 * Orientation Practice — Route
 * Spaced Retrieval / Personal Orientation Practice game.
 * Evidence-informed reality orientation and spaced retrieval training.
 * Citations: Savulich et al., 2017; Han et al., 2017; Smith et al., 2024.
 *
 * Updated: fetches game contacts for people-recognition questions,
 * shows caregiver-uploaded photos for question images and clue images.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSpacedRetrievalStore } from '@/src/features/games/spacedRetrieval/store';
import {
  buildQuestions, buildContactQuestions, mergeAndLimitQuestions, computeSessionScore, processAnswer,
  type SRItem, type PracticeQuestion, type SupportLevel, type GameContact,
} from '@/src/features/games/spacedRetrieval/engine';
import { gamesApi, spacedRetrievalApi } from '@/src/features/games/api';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { sessionStore } from '@/src/state/sessionStore';

const getDefaultItems = (t: any): SRItem[] => [
  { id: 'def1', prompt: t('orientationPractice.defaults.def1.prompt', 'What day of the week is it today?'), correctAnswer: new Date().toLocaleDateString(t('orientationPractice.locale', 'en-US'), { weekday: 'long' }), cueText: t('orientationPractice.defaults.def1.cue', 'Think about what you did this morning.'), category: 'ORIENTATION_DATE', active: true, currentIntervalStep: 0, masteryStatus: 'NEW' },
  { id: 'def2', prompt: t('orientationPractice.defaults.def2.prompt', 'What month are we currently in?'), correctAnswer: new Date().toLocaleDateString(t('orientationPractice.locale', 'en-US'), { month: 'long' }), cueText: t('orientationPractice.defaults.def2.cue', 'Look at a calendar or your phone.'), category: 'ORIENTATION_DATE', active: true, currentIntervalStep: 0, masteryStatus: 'NEW' },
  { id: 'def3', prompt: t('orientationPractice.defaults.def3.prompt', 'Where can you find your daily reminders?'), correctAnswer: t('orientationPractice.defaults.def3.answer', 'In the Reminders section of the app'), cueText: t('orientationPractice.defaults.def3.cue', 'Tap the alarm icon at the bottom.'), category: 'APP_NAVIGATION', active: true, currentIntervalStep: 0, masteryStatus: 'NEW' },
  { id: 'def4', prompt: t('orientationPractice.defaults.def4.prompt', 'What should you do if you feel unwell or need help?'), correctAnswer: t('orientationPractice.defaults.def4.answer', 'Contact your caregiver or call for help'), cueText: t('orientationPractice.defaults.def4.cue', "Your caregiver's number is in your contacts."), category: 'SAFETY_SUPPORT', active: true, currentIntervalStep: 0, masteryStatus: 'NEW' },
  
  // Extra manually added items for screenshot purposes (Demo Patient 1 profile)
  { id: 'def5', prompt: 'What is the name of your primary caregiver?', correctAnswer: 'Demo Caregiver', cueText: 'Their name is listed in your Contacts section.', category: 'PEOPLE_RECOGNITION', active: true, currentIntervalStep: 0, masteryStatus: 'MASTERED' },
  { id: 'def6', prompt: 'Who is Dr. Sameh?', correctAnswer: 'Your Doctor', cueText: 'He checks your health every month.', category: 'PEOPLE_RECOGNITION', active: true, currentIntervalStep: 0, masteryStatus: 'STRENGTHENING' },
  { id: 'def7', prompt: 'What is your morning routine after breakfast?', correctAnswer: 'Check reminders, then follow the morning checklist', cueText: 'Check the morning checklist in the app.', category: 'DAILY_ROUTINE', active: true, currentIntervalStep: 0, masteryStatus: 'NEW' },
  { id: 'def8', prompt: 'Where do you live?', correctAnswer: 'Cairo, Egypt', cueText: 'Your home city.', category: 'ORIENTATION_PLACE', active: true, currentIntervalStep: 0, masteryStatus: 'MASTERED' },
  { id: 'def9', prompt: 'Who helps you with daily medicine reminders?', correctAnswer: 'Demo Caregiver', cueText: 'Your primary caregiver.', category: 'SUPPORT_FACT', active: true, currentIntervalStep: 0, masteryStatus: 'MASTERED' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function OrientationPracticeScreen() {
  const store = useSpacedRetrievalStore();

  useEffect(() => {
    store.reset();
  }, []);

  if (store.phase === 'intro') return <IntroScreen />;
  if (store.phase === 'question') return <QuestionScreen />;
  if (store.phase === 'feedback') return <FeedbackScreen />;
  if (store.phase === 'result') return <ResultScreen />;
  return null;
}

// ─── Intro ────────────────────────────────────────────────────────────────────
function IntroScreen() {
  const { t } = useTranslation();
  const store = useSpacedRetrievalStore();
  const params = useLocalSearchParams<{ reminderId?: string }>();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      let srItems: SRItem[] = [];
      let supportLevel: SupportLevel = 'GUIDED_SUPPORT';
      let enabledFamilies: string[] | undefined = undefined;
      let maxQs = 6;
      let gameContacts: GameContact[] = [];

      try {
        const patientId = sessionStore.getState().userId || 'me';
        const [itemsRes, settingsRes] = await Promise.all([
          spacedRetrievalApi.listItems(patientId, true),
          spacedRetrievalApi.getSettings(patientId),
        ]);

        const fetchedSettings = settingsRes.settings;
        if (fetchedSettings) {
          if (fetchedSettings.supportLevel) supportLevel = fetchedSettings.supportLevel;
          if (fetchedSettings.enabledFamilies) enabledFamilies = fetchedSettings.enabledFamilies;
          if (fetchedSettings.maxQuestionsPerSession) maxQs = fetchedSettings.maxQuestionsPerSession;
        }

        srItems = (itemsRes.items ?? []).map((i: any): SRItem => ({
          id: i.id,
          prompt: i.prompt,
          correctAnswer: i.correctAnswer,
          acceptableAnswers: i.acceptableAnswers ?? [],
          distractors: i.distractors ?? [],
          cueText: i.cueText ?? null,
          category: i.category,
          active: i.active,
          currentIntervalStep: i.currentIntervalStep ?? 0,
          masteryStatus: i.masteryStatus ?? 'NEW',
          patientVisible: i.patientVisible ?? true,
          supportLevelOverride: i.supportLevelOverride ?? null,
          imageAssetId: i.imageAssetId ?? null,
          clueImageAssetId: i.clueImageAssetId ?? null,
          imageUrl: i.imageUrl ?? null,
          clueImageUrl: i.clueImageUrl ?? null,
          linkedContactId: i.linkedContactId ?? null,
        }));

        // Fetch game contacts for people-recognition questions
        try {
          const contactsRes = await spacedRetrievalApi.getGameContacts(patientId);
          gameContacts = (contactsRes.contacts ?? []).map((c: any): GameContact => ({
            id: c.id,
            displayName: c.displayName,
            relationLabel: c.relationLabel ?? null,
            shortMemo: c.shortMemo ?? null,
            photoUrl: c.photoUrl ?? null,
            supportRole: c.supportRole ?? null,
            isSensitive: c.isSensitive ?? false,
          }));
        } catch {
          // Contacts are optional — game proceeds without them
        }
      } catch {
        srItems = getDefaultItems(t);
      }

      if (srItems.length === 0) srItems = getDefaultItems(t);

      // Build caregiver SR questions (already include image fields)
      const srQuestions = buildQuestions(srItems, supportLevel, enabledFamilies, maxQs);

      // Build contact-based people-recognition questions
      const allNames = gameContacts.map((c) => c.displayName);
      const contactQuestions = buildContactQuestions(gameContacts, srItems, supportLevel, allNames);

      // Merge: caregiver items first, then contacts to fill remaining slots
      const finalQuestions = mergeAndLimitQuestions(srQuestions, contactQuestions, maxQs);

      const sessionRes = await gamesApi.startSession({
        gameType: 'PERSONAL_ORIENTATION_PRACTICE',
        reminderId: params.reminderId,
      });
      const sessionId = sessionRes.session?.id ?? `local-${Date.now()}`;

      store.startSession(finalQuestions, sessionId);
    } catch {
      const questions = buildQuestions(getDefaultItems(t), 'GUIDED_SUPPORT', undefined, 10);
      store.startSession(questions, `local-${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.introContainer}>
        <View style={s.introIcon}>
          <Ionicons name="people-outline" size={56} color={colors.secondary[500]} />
        </View>
        <Text style={s.introTitle}>{t('orientationPractice.title', 'Personal Orientation Practice')}</Text>
        <Text style={s.introSubtitle}>
          {t('orientationPractice.subtitle', "Practice remembering helpful daily information. Take your time — there's no rush.")}
        </Text>
        <View style={s.introInfoCard}>
          <Text style={s.introInfoText}>{t('orientationPractice.oneQuestion', '• One question at a time')}</Text>
          <Text style={s.introInfoText}>{t('orientationPractice.tapAnswer', '• Tap the answer you think is correct')}</Text>
          <Text style={s.introInfoText}>{t('orientationPractice.helpfulHint', '• A helpful hint is always available')}</Text>
          <Text style={s.introInfoText}>{t('orientationPractice.sessionsTake', '• Gentle, stress-free daily practice')}</Text>
        </View>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: colors.secondary[500] }]} onPress={handleStart} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.startBtnText}>{t('orientationPractice.beginPractice', 'Begin Practice')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Question Screen ──────────────────────────────────────────────────────────
function QuestionScreen() {
  const { t } = useTranslation();
  const store = useSpacedRetrievalStore();
  const question: PracticeQuestion = store.questions[store.currentQuestionIndex];
  const [showCue, setShowCue] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const total = store.questions.length;
  const current = store.currentQuestionIndex + 1;

  if (!question) return null;

  const handleSelect = (choice: string) => {
    if (selected) return;
    const unsureText = t('orientationPractice.imNotSure', "I'm not sure");
    const isUnsure = choice === unsureText || choice === "I'm not sure";
    const isCorrect = !isUnsure && (
      choice === question.correctAnswer ||
      (question.choices.includes(choice) && choice === question.correctAnswer)
    );
    setSelected(choice);
    setTimeout(() => {
      store.answer(isCorrect, showCue, isUnsure, question, question.isContactQuestion, question.contactId);
      store.setPhase('feedback');
    }, 400);
  };

  const unsureText = t('orientationPractice.imNotSure', "I'm not sure");
  const hasQuestionImage = !!question.imageUrl;
  const hasCueImage = showCue && !!question.clueImageUrl;

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.questionHeader}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(current / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressText}>{t('orientationPractice.progress', { current, total })}</Text>
      </View>

      <ScrollView contentContainerStyle={s.questionBody}>
        <View style={s.questionCard}>
          {/* Question image (person photo or caregiver-uploaded image) */}
          {hasQuestionImage && (
            <Image
              source={{ uri: question.imageUrl! }}
              style={s.questionImage}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
          )}
          {!hasQuestionImage && (
            <Ionicons name="help-circle-outline" size={32} color={colors.secondary[400]} style={{ marginBottom: spacing.md }} />
          )}
          <Text style={s.questionText}>{question.prompt}</Text>
        </View>

        {/* Cue card: text + optional clue image */}
        {showCue && question.cueText && (
          <View style={s.cueCard}>
            <Ionicons name="bulb-outline" size={18} color={colors.warning.main} />
            <View style={{ flex: 1 }}>
              <Text style={s.cueText}>{question.cueText}</Text>
              {hasCueImage && (
                <Image
                  source={{ uri: question.clueImageUrl! }}
                  style={s.cueImage}
                  contentFit="cover"
                />
              )}
            </View>
          </View>
        )}

        <View style={s.choicesContainer}>
          {question.choices.map((choice, i) => (
            <TouchableOpacity
              key={i}
              style={[
                s.choiceBtn,
                selected === choice && { backgroundColor: colors.primary[100], borderColor: colors.primary[400] },
              ]}
              onPress={() => handleSelect(choice)}
              disabled={!!selected}
              activeOpacity={0.8}
            >
              <Text style={[s.choiceText, selected === choice && { color: colors.primary[700] ?? colors.primary[500] }]}>{choice}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.choiceBtn, s.unsureBtn]}
            onPress={() => handleSelect(unsureText)}
            disabled={!!selected}
            activeOpacity={0.8}
          >
            <Text style={s.unsureBtnText}>{unsureText}</Text>
          </TouchableOpacity>
        </View>

        {!showCue && question.cueText && !selected && (
          <TouchableOpacity style={s.cueToggle} onPress={() => setShowCue(true)} activeOpacity={0.7}>
            <Ionicons name="bulb-outline" size={18} color={colors.warning.main} />
            <Text style={s.cueToggleText}>{t('orientationPractice.showHint', 'Show helpful hint')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Feedback Screen ──────────────────────────────────────────────────────────
function FeedbackScreen() {
  const { t } = useTranslation();
  const store = useSpacedRetrievalStore();
  const lastResult = store.results[store.results.length - 1];
  const question: PracticeQuestion = store.questions[store.currentQuestionIndex];
  const isCorrect = lastResult?.correct ?? false;
  const isUnsure = lastResult?.unsure ?? false;

  const goNext = () => {
    if (store.currentQuestionIndex + 1 >= store.questions.length) {
      const score = computeSessionScore(store.results);
      store.finish(score);
      // Submit to backend
      gamesApi.completeSpacedRetrieval(store.sessionId!, {
        score: score.score,
        accuracyPercent: score.accuracyPercent,
        status: 'COMPLETED',
        durationSeconds: Math.max(15, Math.round((Date.now() - store.startedAt) / 1000)),
        metadata: {
          cueUseRate: score.cueUseRate / 100,
          correctWithoutCue: score.correctWithoutCue,
          correctWithCue: score.correctWithCue,
          levelReached: score.levelReached,
          contactQuestionsCount: store.results.filter((r) => r.isContactQuestion).length,
        },
        itemResults: store.questions.map((q, i) => {
          const r = store.results[i];
          return {
            itemIndex: i,
            prompt: q.prompt,
            correct: r?.correct ?? false,
            usedCue: r?.usedCue ?? false,
            firstTryCorrect: r?.correct ?? false,
            responseTimeMs: null,
            selectedAnswer: null,
            correctAnswer: q.correctAnswer,
            metadata: q.isContactQuestion ? { isContactQuestion: true, contactId: q.contactId } : undefined,
          };
        }),
      }).catch(() => {});
    } else {
      store.nextQuestion();
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.feedbackContainer}>
        <View style={[s.feedbackBadge, { backgroundColor: isCorrect ? colors.success.main + '20' : colors.warning.main + '20' }]}>
          <Ionicons
            name={isCorrect ? 'checkmark-circle' : isUnsure ? 'help-circle' : 'refresh-circle'}
            size={48}
            color={isCorrect ? colors.success.main : colors.warning.main}
          />
        </View>
        <Text style={s.feedbackHeading}>
          {isCorrect ? t('orientationPractice.wellDone', 'Well done!') : isUnsure ? t('orientationPractice.noWorries', 'No worries.') : t('orientationPractice.thatsOkay', "That's okay.")}
        </Text>
        <Text style={s.feedbackBody}>
          {isCorrect
            ? t('orientationPractice.youRemembered', 'You remembered that one without any trouble.')
            : t('orientationPractice.answerIs', { answer: question?.correctAnswer })}
        </Text>
        {/* Show cue image on feedback if available */}
        {!isCorrect && question?.imageUrl && (
          <Image source={{ uri: question.imageUrl }} style={s.feedbackImage} contentFit="cover" />
        )}
        {!isCorrect && question?.cueText && (
          <View style={s.cueCard}>
            <Ionicons name="bulb-outline" size={18} color={colors.warning.main} />
            <Text style={s.cueText}>{question.cueText}</Text>
          </View>
        )}
        <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>
            {store.currentQuestionIndex + 1 >= store.questions.length ? t('orientationPractice.seeResults', 'See Practice Summary') : t('orientationPractice.nextQuestion', 'Next Question')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────
function ResultScreen() {
  const { t } = useTranslation();
  const store = useSpacedRetrievalStore();
  const router = useRouter();
  const score = store.score!;
  const total = store.questions.length;

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.introContainer}>
        <View style={[s.introIcon, { backgroundColor: colors.secondary[50] }]}>
          <Ionicons name="ribbon-outline" size={56} color={colors.secondary[500]} />
        </View>
        <Text style={s.introTitle}>{t('orientationPractice.practiceComplete', 'Practice Complete')}</Text>
        <Text style={s.introSubtitle}>
          {t('orientationPractice.rememberedSummary', { correct: score.correctWithoutCue + score.correctWithCue, total })}
          {score.correctWithoutCue > 0 ? t('orientationPractice.withoutHints', { count: score.correctWithoutCue }) : ''}
        </Text>

        <View style={s.resultCard}>
          <SRStatRow label={t('orientationPractice.questionsAnswered', 'Questions answered')} value={`${total}`} />
          <SRStatRow label={t('orientationPractice.correct', 'Remembered correctly')} value={`${score.correctWithoutCue + score.correctWithCue}`} />
          <SRStatRow label={t('orientationPractice.withHint', 'Needed a hint')} value={`${score.correctWithCue}`} />
          <SRStatRow label={t('orientationPractice.levelReached', 'Practice Level')} value={`Level ${score.levelReached}`} />
        </View>

        <TouchableOpacity style={[s.startBtn, { backgroundColor: colors.secondary[500] }]} onPress={() => { store.reset(); }} activeOpacity={0.85}>
          <Text style={s.startBtnText}>{t('orientationPractice.practiceAgain', 'Practice Again')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.exitBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.exitBtnText}>{t('orientationPractice.done', 'Done')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SRStatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background ?? '#f9f9f7' },
  introContainer: { padding: spacing.xl, alignItems: 'center', paddingBottom: 48 },
  introIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.secondary[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  introTitle: { fontSize: 26, fontWeight: '700', color: colors.neutral[800], marginBottom: spacing.sm, textAlign: 'center' },
  introSubtitle: { fontSize: 15, color: colors.neutral[500], textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
  introInfoCard: { width: '100%', backgroundColor: colors.surface ?? '#f0f0ee', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl },
  introInfoText: { fontSize: 14, color: colors.neutral[600], lineHeight: 22 },
  startBtn: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: radius.lg, alignItems: 'center', width: '100%', marginBottom: spacing.md },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  exitBtn: { paddingVertical: 14, alignItems: 'center', width: '100%' },
  exitBtnText: { fontSize: 16, color: colors.neutral[500] },
  questionHeader: { padding: spacing.lg, paddingBottom: spacing.sm },
  progressBar: { height: 6, backgroundColor: colors.neutral[200], borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: colors.secondary[400] ?? colors.primary[400], borderRadius: 3 },
  progressText: { fontSize: 12, color: colors.neutral[400], alignSelf: 'flex-end' },
  questionBody: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg },
  questionCard: { backgroundColor: '#fff', borderRadius: radius.xl ?? radius.lg, padding: spacing.xl, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  questionImage: { width: 140, height: 140, borderRadius: 70, marginBottom: spacing.lg },
  questionText: { fontSize: 20, fontWeight: '600', color: colors.neutral[800], textAlign: 'center', lineHeight: 28 },
  cueCard: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.warning.main + '15', borderRadius: radius.md, padding: spacing.md, alignItems: 'flex-start' },
  cueText: { flex: 1, fontSize: 14, color: colors.neutral[700], lineHeight: 20 },
  cueImage: { width: '100%', height: 120, borderRadius: radius.md, marginTop: spacing.sm },
  choicesContainer: { gap: spacing.md },
  choiceBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.neutral[200], borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 20, minHeight: 56 },
  choiceText: { fontSize: 16, color: colors.neutral[800], textAlign: 'center' },
  unsureBtn: { borderColor: colors.neutral[300], backgroundColor: colors.neutral[50] },
  unsureBtnText: { fontSize: 15, color: colors.neutral[500], textAlign: 'center' },
  cueToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  cueToggleText: { fontSize: 14, color: colors.warning.main, fontWeight: '500' },
  feedbackContainer: { flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  feedbackBadge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  feedbackHeading: { fontSize: 22, fontWeight: '700', color: colors.neutral[800] },
  feedbackBody: { fontSize: 16, color: colors.neutral[600], textAlign: 'center', lineHeight: 24 },
  feedbackImage: { width: 120, height: 120, borderRadius: 60, marginVertical: spacing.md },
  nextBtn: { backgroundColor: colors.secondary[500] ?? colors.primary[500], paddingVertical: 16, paddingHorizontal: 40, borderRadius: radius.lg, alignItems: 'center', width: '100%', marginTop: spacing.lg },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resultCard: { width: '100%', backgroundColor: colors.surface ?? '#f0f0ee', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.xl },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 15, color: colors.neutral[600] },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.neutral[800] },
});
