/**
 * caregiverPatientStore
 *
 * Persists the caregiver's currently selected patient across all tabs.
 * This eliminates the "each tab independently auto-picks patient[0]" problem
 * and enables a real patient-switching UX.
 */
import { create } from 'zustand';
import type { CareLink } from '../features/carelinks/types';

interface CaregiverPatientState {
  /** All active care links for this caregiver */
  links: CareLink[];
  /** The patientUserId of the currently selected patient */
  selectedPatientId: string | null;
  /** Display name of the selected patient (cached for UI) */
  selectedPatientName: string | null;
  /** Whether the links have been loaded at least once */
  loaded: boolean;

  setLinks: (links: CareLink[]) => void;
  selectPatient: (patientUserId: string, displayName: string) => void;
  clearSelection: () => void;
  reset: () => void;
}

export const useCaregiverPatientStore = create<CaregiverPatientState>((set) => ({
  links: [],
  selectedPatientId: null,
  selectedPatientName: null,
  loaded: false,

  setLinks: (links) =>
    set((state) => {
      // Auto-select first active patient if none selected yet
      const first = links.find((l) => l.status === 'active' && l.patientUserId);
      const shouldAutoSelect = !state.selectedPatientId && first;
      return {
        links,
        loaded: true,
        selectedPatientId: shouldAutoSelect ? first!.patientUserId : state.selectedPatientId,
        selectedPatientName: shouldAutoSelect
          ? (first!.patient?.displayName ?? 'Patient')
          : state.selectedPatientName,
      };
    }),

  selectPatient: (patientUserId, displayName) =>
    set({ selectedPatientId: patientUserId, selectedPatientName: displayName }),

  clearSelection: () => set({ selectedPatientId: null, selectedPatientName: null }),

  reset: () =>
    set({ links: [], selectedPatientId: null, selectedPatientName: null, loaded: false }),
}));
