import { useMemo, useCallback } from 'react';
import { useSearchParams } from '@/lib/router';

/**
 * Shared DSA filters via URL: ?dsa= &from= &to= &phase=
 */
export function useDsaFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const dsaAdminId = searchParams.get('dsa') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const phase = searchParams.get('phase') || '';

  const apiParams = useMemo(() => {
    const p = {};
    if (dsaAdminId) p.dsaAdminId = dsaAdminId;
    if (from) p.from = from;
    if (to) p.to = to;
    if (phase && phase !== 'all') p.phase = phase;
    return p;
  }, [dsaAdminId, from, to, phase]);

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value != null && value !== '') next.set(key, String(value));
      else next.delete(key);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const withDsaQuery = useCallback(
    (path) => {
      const q = apiParams;
      const sp = new URLSearchParams();
      if (q.dsaAdminId) sp.set('dsa', q.dsaAdminId);
      if (q.from) sp.set('from', q.from);
      if (q.to) sp.set('to', q.to);
      if (q.phase) sp.set('phase', q.phase);
      const qs = sp.toString();
      return qs ? `${path}?${qs}` : path;
    },
    [apiParams]
  );

  return {
    dsaAdminId,
    from,
    to,
    phase,
    apiParams,
    setDsa: (v) => setParam('dsa', v),
    setFrom: (v) => setParam('from', v),
    setTo: (v) => setParam('to', v),
    setPhase: (v) => setParam('phase', v),
    clearFilters,
    withDsaQuery,
  };
}
