import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer, AppCard, AppButton, AppInput, Icon, LoadingState, EmptyState } from '@/src/shared/ui';
import { PatientSwitcher } from '@/src/shared/ui/PatientSwitcher';
import { useCaregiverLinks } from '@/src/shared/hooks/useCaregiverLinks';
import { useCaregiverPatientStore } from '@/src/state/caregiverPatientStore';
import { colors, typography, spacing, radius } from '@/src/infrastructure/theme/tokens';
import { contactsApi } from '@/src/features/contacts/api';
import { mediaApi } from '@/src/features/media/api';
import type { PatientContact, ContactMemo } from '@/src/features/contacts/types';
import { Image } from 'expo-image';

export default function CaregiverContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // ─── Global patient context ─────────────────────────────────────────────
  useCaregiverLinks();
  const { links, selectedPatientId, selectedPatientName, loaded, selectPatient } = useCaregiverPatientStore();
  const selectedPatient = selectedPatientId;

  // Contacts state
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit state
  const [editingContact, setEditingContact] = useState<PatientContact | null>(null);
  const [relation, setRelation] = useState('');
  const [memo, setMemo] = useState('');
  const [photoAssetId, setPhotoAssetId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load contacts for selected patient
  const load = useCallback(async (isRefresh = false) => {
    if (!selectedPatient) {
      console.log('[CaregiverContacts] No patient selected');
      return;
    }
    console.log(`[CaregiverContacts] Loading contacts for patientId: ${selectedPatient}`);
    if (!isRefresh) setLoading(true);
    try {
      const { contacts: list } = await contactsApi.listContacts(selectedPatient);
      console.log(`[CaregiverContacts] Loaded ${list.length} contacts`);
      setContacts(list);
    } catch (error: any) {
      console.error('[CaregiverContacts] Error loading contacts:', error.message || error);
      Alert.alert('Error', 'Failed to load contacts. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPatient]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const startEditing = (contact: PatientContact) => {
    setEditingContact(contact);
    const m = contact.memo;
    setRelation(m?.relationLabel || '');
    setMemo(m?.shortMemo || '');
    setPhotoAssetId(m?.photoAssetId || null);
    setPhotoUrl(m?.photoAsset?.publicUrl || null);
    setIsFavorite(m?.caregiverFavorite || false);
  };

  const cancelEditing = () => {
    setEditingContact(null);
    setRelation('');
    setMemo('');
    setPhotoAssetId(null);
    setPhotoUrl(null);
    setIsFavorite(false);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLoading(true);
      try {
        const { asset: mediaAsset } = await mediaApi.upload(asset.uri, asset.mimeType || 'image/jpeg');
        setPhotoAssetId(mediaAsset.id);
        setPhotoUrl(mediaAsset.publicUrl);
      } catch (error) {
        Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedPatient || !editingContact) {
      console.log('[CaregiverContacts] Missing patient or contact for save');
      return;
    }
    console.log(`[CaregiverContacts] Saving memo for contact: ${editingContact.id}`);
    const payload = {
      relationLabel: relation,
      shortMemo: memo,
      photoAssetId,
      caregiverFavorite: isFavorite
    };
    console.log('[CaregiverContacts] Payload:', payload);
    setSaving(true);
    try {
      const result = await contactsApi.updateMemo(selectedPatient, editingContact.id, payload);
      console.log('[CaregiverContacts] Save success:', result);
      Alert.alert('Success', 'Contact updated successfully.');
      cancelEditing();
      load(true);
    } catch (error: any) {
      console.error('[CaregiverContacts] Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const selectPatientLocal = (link: any) => {
    selectPatient(link.patientUserId!, link.patient?.displayName ?? 'Patient');
  };

  if (!loaded) return <ScreenContainer><LoadingState /></ScreenContainer>;

  // Show patient selector if no patient selected or multiple patients
  if (!selectedPatient || links.length === 0) {
    return (
      <ScreenContainer>
        <Text style={styles.headerTitle}>Select a Patient</Text>
        <Text style={styles.headerSubtitle}>Choose a patient to view and manage their contacts</Text>
        {links.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Linked Patients"
            message="You need to link with a patient first to manage their contacts."
          />
        ) : (
          <FlatList
            data={links}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AppCard
                style={styles.patientCard}
                onPress={() => selectPatientLocal(item)}
                icon={<Icon name="person-circle-outline" size={28} color={colors.secondary[500]} />}
              >
                <View>
                  <Text style={styles.patientName}>{item.patient?.displayName || 'Patient'}</Text>
                  <Text style={styles.patientEmail}>{item.patient?.email || ''}</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.neutral[400]} />
              </AppCard>
            )}
          />
        )}
      </ScreenContainer>
    );
  }

  // Show edit form if editing a contact
  if (editingContact) {
    return (
      <ScreenContainer>
        <View style={styles.editHeader}>
          <Pressable onPress={cancelEditing} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.neutral[600]} />
          </Pressable>
          <Text style={styles.editTitle}>Edit Contact</Text>
        </View>

        <ScrollView style={styles.editContainer}>
          <View style={styles.photoSection}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={styles.placeholderPhoto}>
                <Text style={styles.placeholderText}>{editingContact.displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <AppButton
              title={photoUrl ? 'Change Photo' : 'Add Photo'}
              onPress={handlePickImage}
              variant="outline"
              size="sm"
            />
          </View>

          <Text style={styles.contactName}>{editingContact.displayName}</Text>
          <Text style={styles.contactPhone}>{(editingContact.normalizedPhones?.[0]) || (editingContact.normalizedEmails?.[0]) || ''}</Text>

          <View style={styles.formSection}>
            <Text style={styles.label}>Relation Label</Text>
            <AppInput
              placeholder="e.g., Son, Daughter, Doctor"
              value={relation}
              onChangeText={setRelation}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Notes</Text>
            <AppInput
              placeholder="Add notes about this contact..."
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={4}
            />
          </View>

          <Pressable style={styles.favoriteRow} onPress={() => setIsFavorite(!isFavorite)}>
            <Icon name={isFavorite ? "star" : "star-outline"} size={24} color={isFavorite ? colors.tertiary.main : colors.neutral[400]} />
            <Text style={styles.favoriteText}>Mark as favorite</Text>
          </Pressable>

          <View style={styles.buttonRow}>
            <AppButton title="Cancel" onPress={cancelEditing} variant="ghost" style={styles.button} />
            <AppButton title="Save" onPress={handleSave} variant="secondary" loading={saving} style={styles.button} />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Show contacts list
  const renderContact = ({ item }: { item: PatientContact }) => {
    const contactMemo = item.memo;
    const contactPhoto = contactMemo?.photoAsset?.publicUrl;

    return (
      <AppCard style={styles.contactCard} onPress={() => startEditing(item)}>
        <View style={styles.contactRow}>
          {contactPhoto ? (
            <Image source={{ uri: contactPhoto }} style={styles.contactAvatar} contentFit="cover" />
          ) : (
            <View style={styles.contactAvatarPlaceholder}>
              <Text style={styles.contactAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.contactInfo}>
            <Text style={styles.contactNameList}>{item.displayName}</Text>
            {contactMemo?.relationLabel ? (
              <Text style={styles.contactRelation}>{contactMemo.relationLabel}</Text>
            ) : (
              <Text style={styles.noRelation}>No relation label</Text>
            )}
            {contactMemo?.shortMemo && (
              <Text style={styles.contactMemo} numberOfLines={1}>{contactMemo.shortMemo}</Text>
            )}
          </View>

          <View style={styles.contactActions}>
            {contactMemo?.caregiverFavorite && (
              <Icon name="star" size={20} color={colors.tertiary.main} />
            )}
            <Icon name="chevron-forward" size={20} color={colors.neutral[400]} />
          </View>
        </View>
      </AppCard>
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerSubtitle}>Managing contacts for {selectedPatientName ?? 'Patient'}</Text>
        </View>
        {links.length > 1 && (
          <PatientSwitcher />
        )}
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No Contacts"
            message="The patient hasn't imported any contacts yet. They need to do this from their app first."
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
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: typography.family.display,
    fontSize: typography.size.xl,
    color: colors.on_surface,
  },
  headerSubtitle: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
  },
  list: {
    paddingBottom: spacing['4xl'],
  },
  patientCard: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientName: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  patientEmail: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
  contactCard: {
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  contactAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface_container_highest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactAvatarText: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface_variant,
  },
  contactInfo: {
    flex: 1,
  },
  contactNameList: {
    fontFamily: typography.family.title,
    fontSize: typography.size.base,
    color: colors.on_surface,
  },
  contactRelation: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.primary.main,
    backgroundColor: colors.primary_container,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  noRelation: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.on_surface_variant,
    fontStyle: 'italic',
    marginTop: 2,
  },
  contactMemo: {
    fontFamily: typography.family.body,
    fontSize: typography.size.xs,
    color: colors.on_surface_variant,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  editTitle: {
    fontFamily: typography.family.display,
    fontSize: typography.size.lg,
    color: colors.on_surface,
  },
  editContainer: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface_container_highest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: typography.family.display,
    fontSize: typography.size['2xl'],
    color: colors.on_surface_variant,
  },
  contactName: {
    fontFamily: typography.family.display,
    fontSize: typography.size.lg,
    color: colors.on_surface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  contactPhone: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface_variant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  formSection: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.family.body,
    fontSize: typography.size.sm,
    color: colors.on_surface,
    marginBottom: spacing.xs,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface_container_low,
    borderRadius: radius.md,
  },
  favoriteText: {
    fontFamily: typography.family.body,
    fontSize: typography.size.base,
    color: colors.on_surface,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
  },
});
