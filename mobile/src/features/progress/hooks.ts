import { useState, useCallback, useEffect } from 'react';
import { progressApi } from './api';
import type { ProgressOverviewResponse, WeeklyProgressResponse } from './types';

export function useProgressOverview(patientId: string | null) {
  const [data, setData] = useState<ProgressOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await progressApi.getOverview(patientId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress overview');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useWeeklyProgress(patientId: string | null) {
  const [data, setData] = useState<WeeklyProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await progressApi.getWeekly(patientId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load weekly progress');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
