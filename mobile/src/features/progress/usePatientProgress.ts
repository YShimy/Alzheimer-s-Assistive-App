import { useState, useCallback, useEffect } from 'react';
import { progressApi } from './api';
import type { 
  ProgressOverviewResponse, 
  ProgressStreaksResponse, 
  ProgressCategoriesResponse, 
  ProgressChartsResponse 
} from './types';

export function usePatientProgress(patientId: string | null) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<ProgressOverviewResponse | null>(null);
  const [streaks, setStreaks] = useState<ProgressStreaksResponse | null>(null);
  const [categories, setCategories] = useState<ProgressCategoriesResponse | null>(null);
  const [charts, setCharts] = useState<ProgressChartsResponse | null>(null);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!patientId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const [ov, st, ca, ch] = await Promise.all([
        progressApi.getOverview(patientId),
        progressApi.getStreaks(patientId),
        progressApi.getCategories(patientId),
        progressApi.getCharts(patientId)
      ]);
      setOverview(ov);
      setStreaks(st);
      setCategories(ca);
      setCharts(ch);
    } catch (err: any) {
      setError(err.message || 'Failed to load progress data');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  const reload = useCallback(() => loadAll(false), [loadAll]);
  const refresh = useCallback(() => loadAll(true), [loadAll]);

  return {
    loading,
    refreshing,
    error,
    overview,
    streaks,
    categories,
    charts,
    reload,
    refresh
  };
}
