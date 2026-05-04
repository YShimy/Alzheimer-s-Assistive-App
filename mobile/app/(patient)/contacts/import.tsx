import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { ScreenContainer, AppButton, AppInput, Icon, LoadingState } from '@/src/shared/ui';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { contactsApi } from '@/src/features/contacts/api';
import { useSessionStore } from '@/src/state/sessionStore';

export default function ContactImportScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchContacts = async () => {
        setLoading(true);
        setSelectedIds(new Set());
        setSearch('');

        try {
          const { status } = await Contacts.requestPermissionsAsync();
          if (status !== 'granted') {
            if (isActive) {
              Alert.alert(t('contacts.permissionDeniedTitle'), t('contacts.permissionDeniedMsg'));
              router.back();
            }
            return;
          }

          // Fetch device contacts
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
          });

          // Fetch already saved contacts
          let savedContactIds = new Set<string>();
          if (userId) {
            try {
              const res = await contactsApi.listContacts(userId);
              // Save the sourceContactId to know what we already imported
              res.contacts.forEach(c => {
                if (c.sourceContactId) savedContactIds.add(c.sourceContactId);
              });
            } catch (e) {
              console.error('Failed to fetch existing contacts', e);
            }
          }

          if (isActive) {
            // Filter out contacts we already have
            const freshContacts = data
              .filter(c => c.id && !savedContactIds.has(c.id))
              .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
            setDeviceContacts(freshContacts);
            setFilteredContacts(freshContacts);
          }
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchContacts();

      return () => {
        isActive = false;
      };
    }, [userId, t, router])
  );

  useEffect(() => {
    const term = search.toLowerCase();
    setFilteredContacts(
      deviceContacts.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.phoneNumbers?.some(p => p.number?.includes(term))
      )
    );
  }, [search, deviceContacts]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (!userId) return;
    if (selectedIds.size === 0) {
      Alert.alert(t('contacts.noSelectionTitle'), t('contacts.noSelectionMsg'));
      return;
    }

    setImporting(true);
    try {
      const toImport = deviceContacts
        .filter(c => selectedIds.has(c.id!))
        .map(c => ({
          id: c.id,
          name: c.name,
          phoneNumbers: c.phoneNumbers?.map(p => p.number!).filter(Boolean),
          emails: c.emails?.map(e => e.email!).filter(Boolean),
        }));

      await contactsApi.importSelected(userId, toImport);
      Alert.alert(t('contacts.importSuccessTitle'), t('contacts.importSuccessMsg', { count: Intl.NumberFormat(i18n.language).format(selectedIds.size) }));
      router.replace('/(patient)/contacts');
    } catch (error) {
      console.error('Import failed', error);
      Alert.alert(t('contacts.importErrorTitle'), t('contacts.importErrorMsg'));
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <LoadingState message={t('contacts.importLoading')} />;

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('contacts.importTitle')}</Text>
        <AppInput
          placeholder={t('contacts.importSearch')}
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name="search-outline" size={20} color={colors.on_surface_variant} />}
        />
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id!);
          return (
            <Pressable 
              style={[styles.contactRow, isSelected && styles.selectedRow]} 
              onPress={() => toggleSelect(item.id!)}
            >
              <View style={[styles.avatar, { backgroundColor: isSelected ? colors.primary.main : colors.surface_container_high }]}>
                <Text style={[styles.avatarText, { color: isSelected ? colors.on_primary : colors.on_surface_variant }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phoneNumbers && item.phoneNumbers.length > 0 && (
                  <Text style={styles.subtext}>{item.phoneNumbers[0].number}</Text>
                )}
              </View>
              <Icon 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={24} 
                color={isSelected ? colors.primary.main : colors.outline_variant} 
              />
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <Text style={styles.countText}>
          {t('contacts.selectedCount', { count: Intl.NumberFormat(i18n.language).format(selectedIds.size) })}
        </Text>
        <AppButton
          title={t('contacts.confirmImport')}
          onPress={handleImport}
          loading={importing}
          disabled={selectedIds.size === 0}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.family.display,
    fontSize: typography.size.xl,
    color: colors.on_surface,
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: 100,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  selectedRow: {
    backgroundColor: colors.primary_container + '40', // 25% opacity
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
  },
  subtext: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.outline_variant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
  },
});
