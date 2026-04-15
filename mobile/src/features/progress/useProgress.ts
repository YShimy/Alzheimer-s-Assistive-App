import { useState, useCallback } from 'react';
import { progressApi } from './api';
import type { 
  ProgressOverviewResponse, 
  ProgressStreaksResponse, 
  ProgressCategoriesResponse, 
  ProgressChartsResponse 
} from './types';
import { useSessionStore } from '../../state/sessionStore';

export function useProgress() {
  const userId = useSessionStore(s => s.userId);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<ProgressOverviewResponse | null>(null);
  const [streaks, setStreaks] = useState<ProgressStreaksResponse | null>(null);
  const [categories, setCategories] = useState<ProgressCategoriesResponse | null>(null);
  const [charts, setCharts] = useState<ProgressChartsResponse | null>(null);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      // In a real app we might combine these or use React Query, but this is fine for MVP
      const [ov, st, ca, ch] = await Promise.all([
        progressApi.getOverview(userId),
        progressApi.getStreaks(userId),
        progressApi.getCategories(userId),
        progressApi.getCharts(userId)
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
  }, [userId]);

  return {
    loading,
    refreshing,
    error,
    overview,
    streaks,
    categories,
    charts,
    reload: () => loadAll(false),
    refresh: () => loadAll(true)
  };
}
