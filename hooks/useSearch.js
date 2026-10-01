import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useSearch Hook
 *
 * Debounced search with AbortController, request-id stale guard and caching.
 * Debounce applies to searchTerm typing only; dependency/filter changes fetch immediately
 * unless `coalesceMs` is set, in which case a burst of changes collapses into one request.
 *
 * @param {Function} fetchFn - The API function to call. Should accept (query, signal, { isRefresh }).
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Debounce delay in ms for search typing (default 500)
 * @param {boolean} options.useCache - Whether to use in-memory caching (default true)
 * @param {number} options.cacheTTL - Cache time-to-live in ms (default 5 mins)
 * @param {string} [options.query] - Controlled search term (e.g. from the URL). The caller debounces
 *   typing itself, so `delay` is not applied; `setSearchTerm` becomes a no-op.
 * @param {number} [options.coalesceMs] - Wait this long after any non-initial change before fetching,
 *   restarting on every change, so rapid filter/search changes send a single request (default 0).
 * @returns {Object} - { results, loading, error, searchTerm, setSearchTerm, refresh }
 */
export function useSearch(fetchFn, options = {}) {
  const {
    delay = 500,
    useCache = true,
    cacheTTL = 5 * 60 * 1000,
    dependencies = [],
    enabled = true,
    /** When true for the current query, skip the list API (e.g. identity redirect). */
    skipFetch = null,
    query: controlledQuery,
    coalesceMs = 0,
  } = options;

  const isControlled = controlledQuery !== undefined;
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = isControlled ? String(controlledQuery ?? '') : internalSearchTerm;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const cacheRef = useRef({});
  const controllerRef = useRef(null);
  const timeoutRef = useRef(null);
  const safetyTimeoutRef = useRef(null);
  const isFirstRunRef = useRef(true);
  const latestRequestIdRef = useRef(0);
  const skipFetchRef = useRef(skipFetch);
  skipFetchRef.current = skipFetch;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const resultsRef = useRef(results);
  resultsRef.current = results;
  /** refresh() while disabled (e.g. list hidden behind a detail page) defers to one forced fetch on re-enable */
  const pendingRefreshRef = useRef(false);
  const prevSearchTermRef = useRef(searchTerm);
  const depsKey = JSON.stringify(dependencies);

  const executeSearch = useCallback(async (query, isRefresh = false) => {
    const requestId = ++latestRequestIdRef.current;

    if (typeof skipFetchRef.current === 'function' && skipFetchRef.current(query)) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const cacheKey = JSON.stringify({ query, dependencies });
    if (useCache && !isRefresh && cacheRef.current[cacheKey]) {
      const { data, timestamp } = cacheRef.current[cacheKey];
      if (Date.now() - timestamp < cacheTTL) {
        if (requestId === latestRequestIdRef.current) {
          setResults(data);
          setHasLoadedOnce(true);
          setLoading(false);
          setRefreshing(false);
          setError(null);
        }
        return;
      }
    }

    if (controllerRef.current) {
      try {
        controllerRef.current.abort();
      } catch {
        /* Ignore abort errors */
      }
    }
    const currentController = new AbortController();
    controllerRef.current = currentController;

    if (isRefresh && resultsRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    // Safety timeout: if request stalls > 25s, release loading spinner
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
        setHasLoadedOnce(true);
      }
    }, 25000);

    try {
      const response = await fetchFn(query, currentController.signal, { isRefresh });

      if (requestId !== latestRequestIdRef.current) {
        return; // Superseded by a newer query
      }

      if (useCache) {
        cacheRef.current[cacheKey] = {
          data: response,
          timestamp: Date.now(),
        };
      }

      setResults(response);
      setHasLoadedOnce(true);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) {
        return; // Superseded by a newer query
      }

      const isCanceled =
        err?.name === 'AbortError' ||
        err?.name === 'CanceledError' ||
        err?.code === 'ERR_CANCELED' ||
        Boolean(err?.__CANCEL__);

      if (isCanceled) {
        return;
      }

      setError(err?.message || 'Search failed');
      setHasLoadedOnce(true);
      console.error('[useSearch] Error:', err);
    } finally {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchFn, useCache, cacheTTL, depsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- depsKey tracks dependencies

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      if (controllerRef.current) {
        try {
          controllerRef.current.abort();
        } catch {
          /* Ignore abort errors */
        }
      }
      // Invalidate any in-flight response so it cannot land while hidden
      latestRequestIdRef.current += 1;
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (typeof skipFetchRef.current === 'function' && skipFetchRef.current(searchTerm)) {
      if (controllerRef.current) {
        try {
          controllerRef.current.abort();
        } catch {
          /* Ignore abort errors */
        }
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      prevSearchTermRef.current = searchTerm;
      isFirstRunRef.current = false;
      executeSearch(searchTerm, true);
      return;
    }

    const cacheKey = JSON.stringify({ query: searchTerm, dependencies });
    const cached = useCache && cacheRef.current[cacheKey];
    const cacheFresh = cached && Date.now() - cached.timestamp < cacheTTL;

    if (cacheFresh) {
      // Supersede any in-flight request for an older key so it cannot overwrite this
      latestRequestIdRef.current += 1;
      if (controllerRef.current) {
        try {
          controllerRef.current.abort();
        } catch {
          /* Ignore abort errors */
        }
      }
      setResults(cached.data);
      setHasLoadedOnce(true);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      prevSearchTermRef.current = searchTerm;
      return;
    }

    const searchChanged = prevSearchTermRef.current !== searchTerm;
    prevSearchTermRef.current = searchTerm;

    // First load fetches immediately. Afterwards: typing debounce (uncontrolled only),
    // otherwise the coalescing window, so a burst of changes becomes one request.
    let waitMs = 0;
    if (!isFirstRunRef.current) {
      const typingDelay = searchChanged && !isControlled ? delay : 0;
      waitMs = Math.max(typingDelay, coalesceMs);
    }
    isFirstRunRef.current = false;

    // Loading is only flagged once the request actually fires (inside executeSearch),
    // so the current rows stay usable while the debounce/coalesce window runs.
    if (waitMs === 0) {
      executeSearch(searchTerm);
    } else {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        executeSearch(searchTerm);
      }, waitMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [searchTerm, delay, executeSearch, enabled, useCache, cacheTTL, depsKey, isControlled, coalesceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  const refresh = useCallback(() => {
    if (!enabledRef.current) {
      pendingRefreshRef.current = true;
      return undefined;
    }
    return executeSearch(searchTermRef.current, true);
  }, [executeSearch]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    isFirstRunRef.current = true;
  }, []);

  const setSearchTerm = isControlled ? noop : setInternalSearchTerm;

  return {
    results,
    loading,
    refreshing,
    hasLoadedOnce,
    error,
    searchTerm,
    setSearchTerm,
    refresh,
    clearCache,
  };
}

function noop() {}
