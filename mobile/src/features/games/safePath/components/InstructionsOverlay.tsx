/**
 * Safe Path Memory — Instructions Screen
 *
 * Explains the game concept with an illustrative mini-grid,
 * then provides a CTA to start playing.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '../../../../infrastructure/theme/tokens';
import { AppButton } from '../../../../shared/ui';

interface InstructionsOverlayProps {
  onStart: () => void;
  onClose?: () => void;
  isReopen?: boolean;
}

export function InstructionsOverlay({ onStart, onClose, isReopen = false }: InstructionsOverlayProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close instructions">
            <Ionicons name="close" size={24} color={colors.neutral[500]} />
          </Pressable>
        )}

        <View style={styles.iconContainer}>
          <Ionicons name="map-outline" size={48} color={colors.primary[500]} />
        </View>

        <Text style={styles.title}>{t('games.safePath.title')}</Text>
        <Text style={styles.subtitle}>{t('games.safePath.instructionsSubtitle')}</Text>

        <View style={styles.stepsContainer}>
          <StepItem
            step={1}
            icon="eye-outline"
            title={t('games.safePath.step1Title')}
            description={t('games.safePath.step1Desc')}
          />
          <StepItem
            step={2}
            icon="navigate-outline"
            title={t('games.safePath.step2Title')}
            description={t('games.safePath.step2Desc')}
          />
          <StepItem
            step={3}
            icon="trending-up-outline"
            title={t('games.safePath.step3Title')}
            description={t('games.safePath.step3Desc')}
          />
        </View>

        {/* Mini illustrative grid */}
        <View style={styles.miniGrid}>
          <View style={styles.miniRow}>
            <View style={[styles.miniTile, styles.miniStart]}>
              <Ionicons name="flag-outline" size={12} color="#fff" />
            </View>
            <View style={[styles.miniTile, styles.miniSafe]} />
            <View style={[styles.miniTile, styles.miniBomb]}>
              <Ionicons name="warning-outline" size={12} color="#fff" />
            </View>
          </View>
          <View style={styles.miniRow}>
            <View style={[styles.miniTile, styles.miniSafe]} />
            <View style={[styles.miniTile, styles.miniPath]} />
            <View style={[styles.miniTile, styles.miniSafe]} />
          </View>
          <View style={styles.miniRow}>
            <View style={[styles.miniTile, styles.miniBomb]}>
              <Ionicons name="warning-outline" size={12} color="#fff" />
            </View>
            <View style={[styles.miniTile, styles.miniSafe]} />
            <View style={[styles.miniTile, styles.miniEnd]}>
              <Ionicons name="trophy-outline" size={12} color="#fff" />
            </View>
          </View>
        </View>

        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={18} color={colors.warning.main} />
          <Text style={styles.tipText}>
            {t('games.safePath.tipText')}
          </Text>
        </View>

        <AppButton
          title={isReopen ? t('games.safePath.backBtn') : t('games.safePath.startBtn')}
          onPress={onStart}
          variant="primary"
          size="lg"
        />
      </View>
    </View>
  );
}

function StepItem({ step, icon, title, description }: {
  step: number;
  icon: any;
  title: string;
  description: string;
}) {
  const { i18n } = useTranslation();
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepIcon}>
        <Ionicons name={icon} size={22} color={colors.primary[500]} />
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{Intl.NumberFormat(i18n.language).format(step)}. {title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 420,
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.xs,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: '700',
    color: colors.neutral[800],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  stepsContainer: {
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  miniGrid: {
    alignSelf: 'center',
    gap: 3,
    marginBottom: spacing['2xl'],
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
  },
  miniRow: {
    flexDirection: 'row',
    gap: 3,
  },
  miniTile: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSafe: {
    backgroundColor: colors.neutral[200],
  },
  miniStart: {
    backgroundColor: colors.primary[500],
  },
  miniEnd: {
    backgroundColor: colors.success.main,
  },
  miniBomb: {
    backgroundColor: colors.error.main,
    opacity: 0.85,
  },
  miniPath: {
    backgroundColor: colors.primary[200],
    borderWidth: 1,
    borderColor: colors.primary[400],
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning.light,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  tipText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.neutral[700],
    lineHeight: 20,
  },
});
