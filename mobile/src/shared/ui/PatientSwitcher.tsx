/**
 * PatientSwitcher
 *
 * Displays the currently selected patient and provides a dropdown/modal
 * to switch to another linked patient. Shared across all caregiver tabs.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '../../infrastructure/theme/tokens';
import { useCaregiverPatientStore } from '../../state/caregiverPatientStore';
import type { CareLink } from '../../features/carelinks/types';

interface Props {
  /** Shown inside the tab's list header area */
  style?: object;
}

export function PatientSwitcher({ style }: Props) {
  const { t } = useTranslation();
  const { links, selectedPatientId, selectedPatientName, selectPatient } =
    useCaregiverPatientStore();
  const [open, setOpen] = useState(false);

  const activeLinks = links.filter((l) => l.status === 'active' && l.patientUserId);

  if (activeLinks.length === 0) return null;

  return (
    <>
      <Pressable
        style={[styles.pill, style]}
        onPress={() => activeLinks.length > 1 && setOpen(true)}
        accessibilityLabel={t('patientHome.connectBtn')}
        accessibilityRole="button"
      >
        <Ionicons name="person-circle-outline" size={20} color={colors.secondary[500]} />
        <View style={styles.pillText}>
          <Text style={styles.pillLabel}>{t('common.managing')}</Text>
          <Text style={styles.pillName} numberOfLines={1}>
            {selectedPatientName ?? t('auth.patient')}
          </Text>
        </View>

        {activeLinks.length > 1 && (
          <Ionicons name="chevron-down" size={16} color={colors.neutral[500]} />
        )}
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('caregiverReminders.managingFor')}</Text>
            <Pressable onPress={() => setOpen(false)} style={styles.closeBtn} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.neutral[600]} />
            </Pressable>
          </View>

          <FlatList
            data={activeLinks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = item.patientUserId === selectedPatientId;
              return (
                <Pressable
                  style={[styles.patientRow, isSelected && styles.patientRowSelected]}
                  onPress={() => {
                    selectPatient(
                      item.patientUserId!,
                      item.patient?.displayName ?? 'Patient',
                    );
                    setOpen(false);
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={32}
                    color={isSelected ? colors.secondary[500] : colors.neutral[400]}
                  />
                  <View style={styles.patientInfo}>
                    <Text style={[styles.patientName, isSelected && styles.patientNameSelected]}>
                      {item.patient?.displayName ?? 'Patient'}
                    </Text>
                    <Text style={styles.patientEmail}>{item.patient?.email ?? ''}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.secondary[500]} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary[50],
    borderWidth: 1,
    borderColor: colors.secondary[100],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  pillText: { flex: 1 },
  pillLabel: {
    fontSize: typography.size.xs,
    color: colors.secondary[600],
    fontWeight: '500',
  },
  pillName: {
    fontSize: typography.size.sm,
    color: colors.neutral[900],
    fontWeight: '700',
  },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  closeBtn: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[100],
  },
  list: { padding: spacing['2xl'], gap: spacing.md },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  patientRowSelected: {
    backgroundColor: colors.secondary[50],
    borderColor: colors.secondary[200],
  },
  patientInfo: { flex: 1 },
  patientName: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  patientNameSelected: { color: colors.secondary[700] },
  patientEmail: {
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
});
