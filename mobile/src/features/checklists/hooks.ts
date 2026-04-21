/** Checklists hooks */

import { useState, useEffect, useCallback } from 'react';
import { checklistsApi } from './api';
import type { ChecklistTemplate } from './types';

export function useChecklistTemplates(patientId?: string) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchTemplates = useCallback(async () => {
    console.log('[ChecklistHook] Fetching templates for patient:', patientId);
    if (!patientId) {
      console.log('[ChecklistHook] No patientId, clearing templates');
      setTemplates([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { templates } = await checklistsApi.listTemplates(patientId);
      console.log('[ChecklistHook] Received templates:', templates.length);
      // Show all templates for now, filter only archived ones
      const activeTemplates = templates.filter((t) => !t.archivedAt);
      console.log('[ChecklistHook] Active templates:', activeTemplates.length);
      setTemplates(activeTemplates);
    } catch (err: any) {
      console.error('[ChecklistHook] Error fetching templates:', err);
      setError(err.message || 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, refresh: fetchTemplates };
}
