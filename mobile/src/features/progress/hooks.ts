import { useState, useCallback, useEffect } from 'react';
import { progressApi } from './api';
import type { 
  ProgressOverviewResponse, 
  WeeklyProgressResponse, 
  ProgressChecklistTrackingResponse, 
  GameProgressSummary,
  ProgressPriorityBreakdownResponse,
  EscalationsResponse,
} from './types';

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

export function useChecklistTracking(patientId: string | null) {
  const [data, setData] = useState<ProgressChecklistTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await progressApi.getChecklistTracking(patientId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load checklist tracking');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useGameProgress(patientId: string | null, gameType: string) {
  const [data, setData] = useState<GameProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await progressApi.getGameProgress(patientId, gameType);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load game progress');
    } finally {
      setLoading(false);
    }
  }, [patientId, gameType]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/**
 * Fetch per-priority reminder adherence breakdown.
 * @param days Number of days to aggregate (default 7)
 */
export function usePriorityBreakdown(patientId: string | null, days = 7) {
  const [data, setData] = useState<ProgressPriorityBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await progressApi.getPriorityBreakdown(patientId, days);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load priority breakdown');
    } finally {
      setLoading(false);
    }
  }, [patientId, days]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/**
 * Fetch recent escalation alerts for a patient (used by caregiver).
 */
export function useEscalations(patientId: string | null, limit = 20) {
  const [data, setData] = useState<EscalationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await progressApi.getEscalations(patientId, limit);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  }, [patientId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

