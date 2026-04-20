import { useState, useCallback, useEffect } from 'react';
import { progressApi } from './api';
import type { ProgressOverviewResponse, WeeklyProgressResponse, ProgressChecklistTrackingResponse, GameProgressSummary } from './types';

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
