import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Platform, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { ScreenContainer, AppButton, AppCard, Icon, LoadingState, EmptyState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { contactsApi } from '@/src/features/contacts/api';
import { useSessionStore } from '@/src/state/sessionStore';
import type { PatientContact } from '@/src/features/contacts/types';
import { Image } from 'expo-image';

import * as Contacts from 'expo-contacts';

export default function ContactsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (!isRefresh) setLoading(true);
    try {
      // First check consent
      const { consent } = await contactsApi.getConsent(userId);
      if (consent.status !== 'GRANTED') {
        router.replace('/(patient)/contacts/consent');
        return;
      }

      const { contacts: list } = await contactsApi.listContacts(userId);
      setContacts(list);
    } catch (error) {
       console.error('Failed to fetch contacts', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleAddContact = async () => {
    if (!userId) return;

    if (Platform.OS === 'web') {
      router.push('/(patient)/contacts/import');
      return;
    }

    try {
      // The native picker doesn't require full contact permissions on modern iOS/Android,
      // but we request it just in case on older versions.
      await Contacts.requestPermissionsAsync();
      
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return; // User cancelled

      // Set importing state
      setLoading(true);

      // Construct a safe display name
      const displayName = contact.name || 
        [contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(' ') || 
        'Unknown';

      const toImport = [{
        id: contact.id,
        name: displayName,
        phoneNumbers: contact.phoneNumbers?.map(p => p.number!).filter(Boolean),
        emails: contact.emails?.map(e => e.email!).filter(Boolean),
      }];

      await contactsApi.importSelected(userId, toImport);
      
      Alert.alert(
        t('contacts.importSuccessTitle', 'Import Successful'), 
        t('contacts.importSuccessMsg', 'Successfully imported {{count}} contacts.', { count: 1 })
      );
      
      // Refresh the list
      fetchData(true);
    } catch (error: any) {
      console.error('Failed to import contact', error);
      if (error?.status === 403) {
         Alert.alert(t('contacts.consentRequiredTitle', 'Consent Required'), t('contacts.consentRequiredMsg', 'The patient must grant consent to sync contacts.'));
      } else {
         Alert.alert(t('contacts.importErrorTitle', 'Import Failed'), t('contacts.importErrorMsg', 'An unexpected error occurred while importing contacts.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const renderContact = ({ item }: { item: PatientContact }) => {
    const memo = item.memo;
    const photoUrl = memo?.photoAsset?.publicUrl;
    
    return (
      <AppCard 
        style={styles.card}
        onPress={() => router.push(`/(patient)/contacts/${item.id}`)}
      >
        <View style={styles.cardContent}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.placeholderAvatar}>
              <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          <View style={styles.info}>
            <Text style={styles.name}>{item.displayName}</Text>
            {memo?.relationLabel && (
              <Text style={styles.relation}>{memo.relationLabel}</Text>
            )}
          </View>

          {memo && (memo.patientFavorite || memo.caregiverFavorite) && (
            <Icon name="star" size={20} color={colors.tertiary.main} />
          )}
          <Icon name="chevron-forward" size={20} color={colors.outline_variant} />
        </View>
      </AppCard>
    );
  };

  if (loading && !refreshing) return <LoadingState message={t('contacts.loading')} />;

  const priorityContacts = contacts.filter(c => c.memo && (c.memo.patientFavorite || c.memo.caregiverFavorite));
  const otherContacts = contacts.filter(c => !c.memo || (!c.memo.patientFavorite && !c.memo.caregiverFavorite));

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('contacts.title')}</Text>
        <Pressable 
          onPress={handleAddContact}
          style={styles.manageBtn}
        >
          <Icon name="add-circle-outline" size={20} color={colors.primary.main} />
          <Text style={styles.manageBtnText}>
            {Platform.OS === 'web'
              ? t('contacts.addManuallyShort', 'Add Contact')
              : contacts.length > 0 ? t('contacts.importMoreBtn') : t('contacts.importBtn')
            }
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={contacts.length > 0 ? [
          { type: 'header', title: t('contacts.priorityTitle'), hide: priorityContacts.length === 0 },
          ...priorityContacts,
          { type: 'header', title: t('contacts.allTitle'), hide: priorityContacts.length === 0 || otherContacts.length === 0 },
          ...otherContacts
        ] : []}
        keyExtractor={(item, index) => (item as any).id || `h-${index}`}
        renderItem={({ item }) => {
          if ((item as any).type === 'header') {
            if ((item as any).hide) return null;
            return <Text style={styles.sectionTitle}>{(item as any).title}</Text>
          }
          return renderContact({ item: item as PatientContact });
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={t('contacts.noContacts')}
            message={t('contacts.noContactsMsg')}
            action={
              <AppButton
                title={Platform.OS === 'web' ? t('contacts.addManuallyShort', 'Add Contact') : t('contacts.importBtn')}
                onPress={handleAddContact}
              />
            }
          />
        }
        contentContainerStyle={styles.list}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.family.display,
    fontSize: typography.size.xl,
    color: colors.on_surface,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.primary_container,
    borderRadius: radius.md,
  },
  manageBtnText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_primary_container,
  },
  sectionTitle: {
    fontFamily: typography.family.headline,
    fontSize: typography.size.base,
    color: colors.on_surface_variant,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    paddingBottom: spacing['4xl'],
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  placeholderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface_container_highest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: typography.family.title,
    fontSize: typography.size.lg,
    color: colors.on_surface_variant,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
  },
  relation: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    marginTop: 2,
  },
});
