/**
 * useCaregiverLinks
 *
 * Loads the caregiver's linked patients once and populates the global
 * caregiverPatientStore. Safe to call from multiple tabs — only fetches
 * when not already loaded.
 */
import { useEffect } from 'react';
import { carelinksApi } from '../../features/carelinks/api';
import { useCaregiverPatientStore } from '../../state/caregiverPatientStore';

export function useCaregiverLinks() {
  const { loaded, setLinks } = useCaregiverPatientStore();

  useEffect(() => {
    if (loaded) return; // already fetched
    carelinksApi
      .getMyLinks()
      .then(({ careLinks }) => {
        const active = careLinks.filter((l) => l.status === 'active' && l.patientUserId);
        setLinks(active);
      })
      .catch((err) => {
        console.warn('[useCaregiverLinks] Failed to load links:', err?.message);
      });
  }, [loaded, setLinks]);
}
