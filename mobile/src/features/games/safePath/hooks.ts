/**
 * Safe Path Memory — Progress Hook
 *
 * Fetches game progress data for charting.
 */
import { useState, useCallback, useEffect } from 'react';
import { safePathApi, type GameProgressResponse } from './api';

export function useGameProgress(patientId: string | null) {
  const [data, setData] = useState<GameProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await safePathApi.getProgress(patientId ?? undefined);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load game progress');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
