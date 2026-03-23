import { useState, useCallback, useEffect } from 'react';
import { remindersApi } from './api';
import type { Reminder } from './types';

/** Fetch and manage a patient's reminder list */
export function useReminders(patientId: string | null, filters?: { active?: string; category?: string; pendingOnly?: boolean }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!patientId) return;
      if (!silent) setLoading(true);
      setError('');
      try {
        const { reminders: r } = await remindersApi.list(patientId, filters);
        setReminders(r);
      } catch (err: any) {
        setError(err.message || 'Failed to load reminders');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patientId, filters?.active, filters?.category, filters?.pendingOnly],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  return { reminders, loading, error, refreshing, refresh, reload, setReminders };
}

/** Submit a reminder action and return loading/error state */
export function useReminderAction(onSuccess: () => void) {
  const [actionLoading, setActionLoading] = useState<string | null>(null); // reminderId being acted on
  const [actionError, setActionError] = useState('');

  const submit = useCallback(
    async (id: string, action: 'done' | 'snooze' | 'skip', extra?: { actionValue?: any; reasonCode?: string }) => {
      setActionLoading(id);
      setActionError('');
      try {
        await remindersApi.recordAction(id, {
          action,
          source: 'reminder_list',
          ...extra,
        });
        onSuccess();
      } catch (err: any) {
        setActionError(err.message || `Failed to mark as ${action}`);
      } finally {
        setActionLoading(null);
      }
    },
    [onSuccess],
  );

  return { actionLoading, actionError, submit };
}
