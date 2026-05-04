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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
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
            fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
          });

          // Fetch already saved contacts
          let existingIds = new Set<string>();
          if (userId) {
            try {
              const res = await contactsApi.listContacts(userId);
              res.contacts.forEach(c => {
                if (c.sourceContactId) existingIds.add(c.sourceContactId);
              });
            } catch (e) {
              console.error('Failed to fetch existing contacts', e);
            }
          }

          if (isActive) {
            const sortedContacts = [...data].sort((a, b) => 
              (a.name || '').localeCompare(b.name || '')
            );
            setSavedIds(existingIds);
            setDeviceContacts(sortedContacts);
            setFilteredContacts(sortedContacts);
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
      deviceContacts.filter(c => {
        const name = c.name || 'Unknown';
        const nameMatch = name.toLowerCase().includes(term);
        const phoneMatch = c.phoneNumbers?.some(p => p.number?.includes(term));
        return nameMatch || phoneMatch;
      })
    );
  }, [search, deviceContacts]);

  const toggleSelect = (id: string) => {
    if (savedIds.has(id)) return; // prevent toggling already imported
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (!userId) return;
    if (selectedIds.size === 0) {
      Alert.alert(t('contacts.noSelectionTitle', 'No Contacts Selected'), t('contacts.noSelectionMsg', 'Please select at least one contact to import.'));
      return;
    }

    setImporting(true);
    try {
      const toImport = deviceContacts
        .filter(c => selectedIds.has(c.id!))
        .map(c => ({
          id: c.id,
          name: c.name || 'Unknown',
          phoneNumbers: c.phoneNumbers?.map(p => p.number!).filter(Boolean),
          emails: c.emails?.map(e => e.email!).filter(Boolean),
        }));

      // Auto-grant consent since the user is actively choosing to import contacts
      await contactsApi.grantConsent(userId, 'import_screen');
      await contactsApi.importSelected(userId, toImport);
      
      Alert.alert(
        t('contacts.importSuccessTitle', 'Import Successful'), 
        t('contacts.importSuccessMsg', 'Successfully imported {{count}} contacts.', { count: Intl.NumberFormat(i18n.language).format(selectedIds.size) })
      );
      router.replace('/(patient)/contacts');
    } catch (error: any) {
      console.error('Import failed', error);
      // If backend throws 403 because consent wasn't granted
      if (error?.status === 403) {
         Alert.alert(t('contacts.consentRequiredTitle', 'Consent Required'), t('contacts.consentRequiredMsg', 'The patient must grant consent to sync contacts.'));
      } else {
         Alert.alert(t('contacts.importErrorTitle', 'Import Failed'), t('contacts.importErrorMsg', 'An unexpected error occurred while importing contacts.'));
      }
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <LoadingState message={t('contacts.importLoading', 'Loading contacts...')} />;

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('contacts.importTitle', 'Import Contacts')}</Text>
        <AppInput
          placeholder={t('contacts.importSearch', 'Search contacts...')}
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name="search-outline" size={20} color={colors.on_surface_variant} />}
        />
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => {
          const isAlreadyImported = savedIds.has(item.id!);
          const isSelected = selectedIds.has(item.id!);
          const displayName = item.name || 'Unknown';
          
          return (
            <Pressable 
              style={[
                styles.contactRow, 
                isSelected && styles.selectedRow,
                isAlreadyImported && styles.importedRow
              ]} 
              onPress={() => toggleSelect(item.id!)}
              disabled={isAlreadyImported}
            >
              <View style={[
                styles.avatar, 
                { backgroundColor: isSelected ? colors.primary.main : isAlreadyImported ? colors.surface_container : colors.surface_container_high }
              ]}>
                <Text style={[
                  styles.avatarText, 
                  { color: isSelected ? colors.on_primary : isAlreadyImported ? colors.outline : colors.on_surface_variant }
                ]}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, isAlreadyImported && { color: colors.outline }]}>{displayName}</Text>
                {item.phoneNumbers && item.phoneNumbers.length > 0 && (
                  <Text style={[styles.subtext, isAlreadyImported && { color: colors.outline }]}>{item.phoneNumbers[0].number}</Text>
                )}
              </View>
              {isAlreadyImported ? (
                <Text style={styles.importedText}>{t('contacts.importedLabel', 'Imported')}</Text>
              ) : (
                <Icon 
                  name={isSelected ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={isSelected ? colors.primary.main : colors.outline_variant} 
                />
              )}
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <Text style={styles.countText}>
          {t('contacts.selectedCount', '{{count}} selected', { count: Intl.NumberFormat(i18n.language).format(selectedIds.size) })}
        </Text>
        <AppButton
          title={t('contacts.confirmImport', 'Import')}
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
  importedRow: {
    backgroundColor: colors.surface_container_lowest,
    opacity: 0.8,
  },
  importedText: {
    fontFamily: typography.family.label,
    fontSize: typography.size.sm,
    color: colors.outline,
    paddingHorizontal: spacing.sm,
  },
});
