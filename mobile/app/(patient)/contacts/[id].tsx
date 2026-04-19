import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ScreenContainer, AppButton, Icon, LoadingState, AppCard } from '@/src/shared/ui';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { contactsApi } from '@/src/features/contacts/api';
import { useSessionStore } from '@/src/state/sessionStore';
import type { PatientContact } from '@/src/features/contacts/types';
import { Image } from 'expo-image';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  
  const [contact, setContact] = useState<PatientContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    (async () => {
      if (!userId || !id) return;
      try {
        const { contacts } = await contactsApi.listContacts(userId);
        const item = contacts.find(c => c.id === id);
        if (item) setContact(item);
        else router.back();
      } catch (error) {
        console.error('Failed to fetch contact details', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, userId]);

  const toggleFavorite = async () => {
    if (!contact || !userId) return;
    setToggling(true);
    try {
      const isFav = contact.memo?.patientFavorite;
      await contactsApi.updateMemo(userId, contact.id, {
        patientFavorite: !isFav
      });
      setContact({
        ...contact,
        memo: contact.memo ? { ...contact.memo, patientFavorite: !isFav } : undefined
      } as any);
    } catch (error) {
      console.error('Toggle favorite failed', error);
    } finally {
      setToggling(false);
    }
  };

  const makeCall = () => {
    if (contact?.normalizedPhones?.[0]) {
      Linking.openURL(`tel:${contact.normalizedPhones[0]}`);
    }
  };

  const sendEmail = () => {
    if (contact?.normalizedEmails?.[0]) {
       Linking.openURL(`mailto:${contact.normalizedEmails[0]}`);
    }
  };

  if (loading) return <LoadingState />;
  if (!contact) return null;

  const memo = contact.memo;
  const photoUrl = memo?.photoAsset?.publicUrl;

  return (
    <ScreenContainer>
      <ScrollView bounces={false} showVerticalScrollIndicator={false}>
        <View style={styles.header}>
            <View style={styles.avatarContainer}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.mainAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.mainAvatar, styles.placeholderMainAvatar]}>
                  <Text style={styles.avatarLargeText}>{contact.displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Pressable 
                style={[styles.favBadge, memo?.patientFavorite && styles.favBadgeActive]}
                onPress={toggleFavorite}
                disabled={toggling}
              >
                <Icon 
                    name={memo?.patientFavorite ? "star" : "star-outline"} 
                    size={24} 
                    color={memo?.patientFavorite ? colors.on_primary : colors.primary.main} 
                />
              </Pressable>
            </View>

            <Text style={styles.name}>{contact.displayName}</Text>
            {memo?.relationLabel && (
              <View style={styles.relationBadge}>
                <Text style={styles.relationText}>{memo.relationLabel}</Text>
              </View>
            )}
        </View>

        {memo?.shortMemo && (
          <AppCard style={styles.memoCard}>
            <View style={styles.memoHeader}>
               <Icon name="information-circle-outline" size={20} color={colors.primary.main} />
               <Text style={styles.memoTitle}>{t('contacts.memo')}</Text>
            </View>
            <Text style={styles.memoText}>{memo.shortMemo}</Text>
          </AppCard>
        )}

        <View style={styles.contactActions}>
            {contact.normalizedPhones?.[0] && (
               <ActionButton 
                 icon="call-outline" 
                 label={t('contacts.call')} 
                 onPress={makeCall} 
                 color={colors.secondary.main}
               />
            )}
            {contact.normalizedEmails?.[0] && (
               <ActionButton 
                 icon="mail-outline" 
                 label={t('contacts.email')} 
                 onPress={sendEmail} 
                 color={colors.primary.main}
               />
            )}
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

function ActionButton({ icon, label, onPress, color }: any) {
    return (
        <Pressable style={styles.actionBtn} onPress={onPress}>
            <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
                <Icon name={icon} size={28} color={color} />
            </View>
            <Text style={[styles.actionLabel, { color }]}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  mainAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  placeholderMainAvatar: {
    backgroundColor: colors.primary_container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontFamily: typography.family.display,
    fontSize: 48,
    color: colors.on_primary_container,
  },
  favBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: colors.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  favBadgeActive: {
    backgroundColor: colors.primary.main,
  },
  name: {
    fontFamily: typography.family.display,
    fontSize: typography.size['2xl'],
    color: colors.on_surface,
    marginBottom: spacing.xs,
  },
  relationBadge: {
    backgroundColor: colors.secondary_container,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  relationText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_secondary_container,
  },
  memoCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface_container_low,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  memoTitle: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.primary.main,
    textTransform: 'uppercase',
  },
  memoText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface,
    lineHeight: typography.lineHeight.relaxed,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['3xl'],
    marginTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  actionBtn: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
  }
});
