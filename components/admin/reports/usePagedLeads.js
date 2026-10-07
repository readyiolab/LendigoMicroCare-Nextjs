import { useCallback, useEffect, useRef, useState } from 'react';

export function usePagedLeads(fetcher, filters, enabled = true, refreshKey = 0) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState({ leads: [], total: 0, page: 1, pageSize: 25, extra: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const filtersKey = JSON.stringify(filters || {}) + `|${refreshKey}`;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const load = useCallback(async (controller) => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetcherRef.current(
        { ...(filters || {}), search, page, pageSize: 25 },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      if (response?.status === 1) {
        const data = response.data || {};
        setResult({
          leads: data.leads || [],
          total: Number(data.total || 0),
          page: Number(data.page || page),
          pageSize: Number(data.pageSize || 25),
          extra: data,
        });
      } else {
        setError(response?.message || 'Could not load cases');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err?.message || 'Could not load cases');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [enabled, filtersKey, search, page]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    load(controller);
    return () => controller.abort();
  }, [enabled, load]);

  return {
    leads: result.leads,
    total: result.total,
    pageSize: result.pageSize,
    extra: result.extra,
    loading,
    error,
    page,
    setPage,
    searchInput,
    setSearchInput,
  };
}
