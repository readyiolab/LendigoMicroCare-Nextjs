import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useNavigate, useSearchParams, Outlet, useLocation } from '@/lib/router';
import { useAdminAuth } from '@/contexts';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Modular Components
import ApplicationFilters from '@/components/admin/applications/ApplicationFilters';
import ApplicationTable from '@/components/admin/applications/ApplicationTable';
import ApplicationHistoryModal from '@/components/admin/applications/ApplicationHistoryModal';
import { Spinner } from '@/components/ui/spinner';
import { resolveApplicationListView } from '@/config/applicationListViews';
import { applicationDetailPath } from '@/utils/applicationRef';
import { customerHistoryPath, isCustomerHistoryQuery, isLoanAccountQuery, account360Path } from '@/utils/customerIdentity';
import { resolveAdminApplicationSearch } from '@/utils/adminApplicationSearch';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';

const CallLogsSheet = lazy(() => import('@/components/admin/application-details/CallLogsSheet'));

const SORTABLE_FIELDS = ['disbursed_at', 'status_updated_at'];

const preloadApplicationDetails = () => {
  import('@/views/admin/ApplicationDetailsPage').catch(() => {});
};

export default function AdminApplications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { admin } = useAdminAuth();
  const [applications, setApplications] = useState([]);
  
  const isDetailView = useMemo(() => {
    const path = location.pathname.replace(/\/$/, '');
    if (path === '/admin/applications') return false;
    if (path.startsWith('/admin/applications/fill/')) return false;
    return /^\/admin\/applications\/[^/]+$/.test(path);
  }, [location.pathname]);

  useEffect(() => {
    preloadApplicationDetails();
  }, []);
  const [error, setError] = useState('');
  const urlAssigned = searchParams.get('assigned');
  const urlRepeat = searchParams.get('repeat');
  const urlBucket = searchParams.get('bucket') || '';
  const urlDisbursal = searchParams.get('disbursal') || '';
  const urlState = searchParams.get('state') || '';
  const urlDateFrom = searchParams.get('date_from') || '';
  const urlDateTo = searchParams.get('date_to') || '';
  const urlCreditManager = searchParams.get('credit_assigned_to') || '';
  const role = admin?.role_code || admin?.role;
  const isTelecaller = role === 'telecaller';
  const defaultStatus = isTelecaller ? 'incomplete' : 'all';
  const statusFilter = searchParams.get('status') || defaultStatus;
  const stateFilter = urlState;
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const statesLoadedRef = useRef(false);
  const dateFrom = urlDateFrom;
  const dateTo = urlDateTo;
  const creditManagerFilter = urlCreditManager;
  const [creditManagers, setCreditManagers] = useState([]);
  const [loadingCreditManagers, setLoadingCreditManagers] = useState(false);
  const creditManagersLoadedRef = useRef(false);
  const [statusCounts, setStatusCounts] = useState({});
  const countsQueueRef = useRef('');
  // URL is the single source of truth for page / search / filters: one change = one URL update = one fetch
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = Number.isInteger(urlPage) && urlPage > 0 ? urlPage : 1;
  const urlSearch = (searchParams.get('search') || '').trim();
  const sortField = SORTABLE_FIELDS.includes(searchParams.get('sort')) ? searchParams.get('sort') : '';
  const sortOrder = sortField && searchParams.get('order') === 'asc' ? 'asc' : sortField ? 'desc' : '';
  const sort = useMemo(() => ({ field: sortField, order: sortOrder }), [sortField, sortOrder]);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({ totalCount: 0, limit: 20, currentPage: 1 });

  const listView = useMemo(() => resolveApplicationListView(searchParams), [searchParams]);

  // react-router does not queue setSearchParams like setState: pass every key for one change in a single call
  const syncSearchParams = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value == null || value === '' || value === 'all') next.delete(key);
        else next.set(key, value);
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handlePageChange = useCallback((newPage) => {
    syncSearchParams({ page: newPage > 1 ? String(newPage) : null });
  }, [syncSearchParams]);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    syncSearchParams({ page: null });
  }, [syncSearchParams]);

  // Header click cycles: newest first -> oldest first -> default (applied date)
  const handleSortChange = useCallback((field) => {
    if (sortField !== field) {
      syncSearchParams({ sort: field, order: 'desc', page: null });
    } else if (sortOrder === 'desc') {
      syncSearchParams({ sort: field, order: 'asc', page: null });
    } else {
      syncSearchParams({ sort: null, order: null, page: null });
    }
  }, [sortField, sortOrder, syncSearchParams]);

  const handleStatusFilterChange = useCallback((value) => {
    syncSearchParams({ status: value === 'all' ? null : value, page: null });
  }, [syncSearchParams]);

  const handleStateFilterChange = useCallback((value) => {
    syncSearchParams({ state: value || null, page: null });
  }, [syncSearchParams]);

  const handleDateFromChange = useCallback((value) => {
    syncSearchParams({ date_from: value || null, page: null });
  }, [syncSearchParams]);

  const handleDateToChange = useCallback((value) => {
    syncSearchParams({ date_to: value || null, page: null });
  }, [syncSearchParams]);

  const handleCreditManagerFilterChange = useCallback((value) => {
    syncSearchParams({ credit_assigned_to: value || null, page: null });
  }, [syncSearchParams]);

  const ensureStatesLoaded = useCallback(() => {
    if (statesLoadedRef.current || loadingStates) return;
    setLoadingStates(true);
    adminAPI.getLookupStates()
      .then((res) => {
        if (res.status === 1) setStates(res.data?.states || []);
        statesLoadedRef.current = true;
      })
      .catch(() => {})
      .finally(() => setLoadingStates(false));
  }, [loadingStates]);

  const ensureCreditManagersLoaded = useCallback(() => {
    if (creditManagersLoadedRef.current || loadingCreditManagers) return;
    setLoadingCreditManagers(true);
    adminAPI.getLookupCreditManagers()
      .then((res) => {
        if (res.status === 1) setCreditManagers(res.data?.creditManagers || []);
        creditManagersLoadedRef.current = true;
      })
      .catch(() => {})
      .finally(() => setLoadingCreditManagers(false));
  }, [loadingCreditManagers]);

  const handleDisbursalFilterChange = useCallback((value) => {
    syncSearchParams({ disbursal: value || null, page: null });
  }, [syncSearchParams]);

  // Debounced commit from the search box: CUS / PAN / Lead / LAN open history or Account 360,
  // anything else becomes ?search= while keeping every active filter.
  const handleSearchCommit = useCallback((value) => {
    const q = String(value || '').trim();
    if (isLoanAccountQuery(q) || isCustomerHistoryQuery(q)) {
      resolveAdminApplicationSearch(navigate, q);
      return;
    }
    syncSearchParams({ search: q || null, page: null });
  }, [navigate, syncSearchParams]);
  
  // Navigation handled via react-router

  // Call logs sheet: the application row it was opened from
  const [callLogApp, setCallLogApp] = useState(null);

  // MIS State
  const [showMISMenu, setShowMISMenu] = useState(false);

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [appHistory, setAppHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [teleStats, setTeleStats] = useState({ callsToday: 0, conversionsToday: 0, dailyTarget: 50 });
  const [lockingAppId, setLockingAppId] = useState(null);

  // Search & Data Layer
  const {
    results,
    loading,
    refreshing,
    hasLoadedOnce,
    error: searchError,
    refresh,
    clearCache: clearSearchCache
  } = useSearch(
    useCallback((query, signal, { isRefresh } = {}) => {
        const countsQueueKey = `${admin?.id || ''}|${admin?.role_code || admin?.role || ''}|${urlAssigned || ''}|${urlBucket || ''}`;
        const queueChanged = countsQueueRef.current !== countsQueueKey;
        const params = { page: currentPage, limit: pageSize };
        if (queueChanged || isRefresh) params.includeCounts = 'true';
        if (queueChanged) countsQueueRef.current = countsQueueKey;
        if (isRefresh) params._t = Date.now();
        if (statusFilter !== 'all') params.status = statusFilter;
        if (query) params.search = query;

        if (urlAssigned === 'me' && admin?.id) {
            const role = admin?.role_code || admin?.role;
            if (role === 'credit_manager') {
                params.credit_assigned_to = admin.id;
            } else if (role === 'underwriter') {
                params.underwriter_assigned_to = admin.id;
            } else if (role === 'operations_manager' || role === 'operations') {
                params.ops_assigned_to = admin.id;
            } else {
                params.assigned_to = admin.id;
            }
        }
        if (urlRepeat === '1') {
            params.is_repeat_customer = '1';
        }
        if (urlBucket && ['fresh', 'repeat', 'sanctional'].includes(urlBucket)) {
            params.bucket = urlBucket;
        }
        if (urlDisbursal === 'latest') params.disbursal = 'latest';
        if (stateFilter) params.state = stateFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (creditManagerFilter && (admin?.role_code || admin?.role) !== 'credit_manager') {
          params.credit_assigned_to = creditManagerFilter;
        }
        if (sortField) {
          params.sortBy = sortField;
          params.sortOrder = sortOrder.toUpperCase();
        }
        return adminAPI.getApplications(params, { signal });
    }, [currentPage, pageSize, statusFilter, admin, urlAssigned, urlRepeat, urlBucket, urlDisbursal, stateFilter, dateFrom, dateTo, creditManagerFilter, sortField, sortOrder]),
    useMemo(
      () => ({
        query: urlSearch,
        // Filter panel / pagination bursts (e.g. "Clear all", date range) collapse into one request
        coalesceMs: 120,
        useCache: true,
        dependencies: [
          currentPage,
          pageSize,
          statusFilter,
          urlAssigned,
          urlRepeat,
          urlBucket,
          urlDisbursal,
          stateFilter,
          dateFrom,
          dateTo,
          creditManagerFilter,
          sortField,
          sortOrder,
          admin?.id,
          admin?.role_code || admin?.role,
        ],
        // Wait for admin.id before My assigned so we never paint an unscoped portfolio then empty
        enabled: !isDetailView && (urlAssigned !== 'me' || Boolean(admin?.id)),
        // CUS / PAN / Lead / LAN redirect to history or Account 360 — don't race getApplications
        skipFetch: (q) => {
          const term = String(q || '').trim();
          return isLoanAccountQuery(term) || isCustomerHistoryQuery(term);
        },
      }),
      [urlSearch, currentPage, pageSize, statusFilter, urlAssigned, urlRepeat, urlBucket, urlDisbursal, stateFilter, dateFrom, dateTo, creditManagerFilter, sortField, sortOrder, isDetailView, admin?.id, admin?.role_code, admin?.role]
    )
  );

  const handleClearFilters = useCallback(() => {
    const r = admin?.role_code || admin?.role;
    // Telecaller keeps incomplete default; UW/Ops All apps stays portfolio-wide (no status).
    if (r === 'telecaller') {
      setSearchParams({ status: 'incomplete' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams, admin]);

  useEffect(() => {
    if (results?.status === 1) {
      setApplications(results.data.applications);
      if (results.data.statusCounts) {
        setStatusCounts(results.data.statusCounts);
      }
      if (results.data.pagination) {
        setPagination({
          totalCount: results.data.pagination.totalCount ?? results.data.pagination.total ?? 0,
          limit: results.data.pagination.limit ?? pageSize,
          currentPage: results.data.pagination.currentPage ?? results.data.pagination.page ?? currentPage,
        });
      }
    } else if (results && results.status !== 1) {
      setError(results.message || 'Failed to fetch applications');
    }
  }, [results, pageSize, currentPage]);

  const handleApplicationUpdated = useCallback((appId, newStatus) => {
    if (appId && newStatus) {
      setApplications((prev) =>
        prev.map((app) =>
          String(app.id) === String(appId)
            ? { ...app, application_status: newStatus }
            : app
        )
      );
    }
    clearSearchCache();
    refresh();
  }, [clearSearchCache, refresh]);

  // Opening a detail page queues exactly one forced refetch for when the list becomes visible again
  // (the list is disabled while hidden, so refresh() defers instead of fetching behind the detail page).
  useEffect(() => {
    if (isDetailView) refresh();
  }, [isDetailView, refresh]);

  // Deep links like ?search=CUS000123 / PAN / Lead / LAN open history or Account 360
  useEffect(() => {
    if (isLoanAccountQuery(urlSearch)) {
      navigate(account360Path(urlSearch));
    } else if (isCustomerHistoryQuery(urlSearch)) {
      navigate(customerHistoryPath(urlSearch));
    }
  }, [urlSearch, navigate]);

  const fetchTelecallerStats = useCallback(async () => {
    try {
      const response = await adminAPI.getTelecallerStats();
      if (response.status === 1) {
        setTeleStats(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch telecaller stats", err);
    }
  }, []);

  // Initial load: Telecaller stats only
  useEffect(() => {
    if (isDetailView || !admin) return;
    if (admin.role_code === 'telecaller' || admin.role === 'telecaller') {
      fetchTelecallerStats();
    }
  }, [fetchTelecallerStats, isDetailView, admin]);

  // Persist telecaller default incomplete filter in URL once (so refresh keeps scope)
  useEffect(() => {
    const isTele = (admin?.role_code || admin?.role) === 'telecaller';
    if (isTele && !searchParams.get('status')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('status', 'incomplete');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams, admin]);

  // openSheet removed

  const openHistory = useCallback(async (appId) => {
      setIsHistoryOpen(true);
      setLoadingHistory(true);
      setAppHistory([]);
      try {
          const response = await adminAPI.getActivityLogs({ applicationId: appId });
          if (response.status === 1) {
              setAppHistory(response.data.logs);
          }
      } catch (err) {
          console.error("Failed to fetch history", err);
      } finally {
          setLoadingHistory(false);
      }
  }, []);

  const openLogCall = useCallback((app) => {
      setCallLogApp(app);
  }, []);

  const handleLockAndAction = useCallback(async (appId, actionType, redirectPath = null) => {
    setLockingAppId(appId);
    try {
      // ✅ Optimization: We no longer call lockApplication here for review/open.
      // Details page acquires the lock via acquireLock=true.
      
      if (actionType === 'fill') {
        const leadId = redirectPath;
        if (!leadId) {
          setError('This application has no lead id yet. Refresh the list and try Fill again.');
          return;
        }
        navigate(`/admin/applications/fill/${encodeURIComponent(leadId)}`);
        return;
      }

      if (redirectPath) {
        navigate(redirectPath);
        return;
      }

      preloadApplicationDetails();
      navigate(applicationDetailPath(appId));
    } catch (err) {
      setError(err.message || 'Failed to lock application');
    } finally {
      setLockingAppId(null);
    }
  }, [navigate]);

  // Handle URL "open" param for direct linking (application_number or legacy id)
  useEffect(() => {
    const openRef = searchParams.get('open');
    if (openRef) {
        navigate(applicationDetailPath(openRef));
    }
  }, [searchParams, navigate]);

  const handleDownloadMIS = useCallback(async (type) => {
      setShowMISMenu(false);
      try {
          const response = await adminAPI.exportMIS(type);
          const data = response.data || response;
          const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const dateStr = new Date().toISOString().split('T')[0];
          const filename = `MIS_${type === 'all' ? 'Full' : type === 'pre_sanction' ? 'PreSanction' : 'PostDisbursement'}_${dateStr}.csv`;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          if (link.parentNode) link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
      } catch (err) {
          setError(err.message || 'Failed to download MIS export.');
      }
  }, []);

  const handleCallLogged = useCallback(() => {
      refresh();
      const role = admin?.role_code || admin?.role;
      if (role === 'telecaller') fetchTelecallerStats();
  }, [admin, refresh, fetchTelecallerStats]);

  const outletContext = useMemo(
    () => ({ onApplicationUpdated: handleApplicationUpdated }),
    [handleApplicationUpdated]
  );

  return (
    <>
      {!isDetailView && (
      <div className="space-y-3 animate-in fade-in duration-300">
        <ApplicationFilters
            listView={listView}
            statusFilter={statusFilter}
            setStatusFilter={handleStatusFilterChange}
            searchQuery={urlSearch}
            setSearchQuery={handleSearchCommit}
            statusCounts={statusCounts}
            filteredCount={pagination.totalCount}
            currentAdminRole={admin?.role_code || admin?.role}
            teleStats={teleStats}
            loading={loading}
            handleDownloadMIS={handleDownloadMIS}
            showMISMenu={showMISMenu}
            setShowMISMenu={setShowMISMenu}
            refresh={refresh}
            refreshing={refreshing}
            onClearFilters={
              listView.hasActiveFilter || urlDisbursal || stateFilter || dateFrom || dateTo || creditManagerFilter
                ? handleClearFilters
                : undefined
            }
            onClearAllFilters={handleClearFilters}
            onSearchSubmit={handleSearchCommit}
            disbursalFilter={urlDisbursal}
            setDisbursalFilter={handleDisbursalFilterChange}
            dateFrom={dateFrom}
            setDateFrom={handleDateFromChange}
            dateTo={dateTo}
            setDateTo={handleDateToChange}
            stateFilter={stateFilter}
            setStateFilter={handleStateFilterChange}
            states={states}
            onStateFocus={ensureStatesLoaded}
            loadingStates={loadingStates}
            creditManagerFilter={creditManagerFilter}
            setCreditManagerFilter={handleCreditManagerFilterChange}
            creditManagers={creditManagers}
            onCreditManagerFocus={ensureCreditManagersLoaded}
            loadingCreditManagers={loadingCreditManagers}
        />

        {(error || searchError) && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 rounded-lg">
            <AlertDescription className="text-sm">{error || searchError}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
          <ApplicationTable 
              applications={applications}
              loading={loading || refreshing || (!hasLoadedOnce && applications === null)}
              currentAdminRole={admin?.role_code || admin?.role}
              currentAdminId={admin?.id}
              lockingAppId={lockingAppId}
              handleLockAndAction={handleLockAndAction}
              openHistory={openHistory}
              openLogCall={openLogCall}
              statusFilter={statusFilter}
              listView={listView}
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              sort={sort}
              onSortChange={handleSortChange}
          />
        </div>
      </div>
      )}

      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Spinner className="size-8" />
          </div>
        }
      >
        <Outlet context={outletContext} />
      </Suspense>

      {!isDetailView && (
      <>
      <Suspense fallback={null}>
        {callLogApp && (
          <CallLogsSheet
              open
              onOpenChange={(open) => { if (!open) setCallLogApp(null); }}
              applicationId={callLogApp.id}
              customerName={callLogApp.name}
              applicationLabel={callLogApp.applicationLabel}
              mobile={callLogApp.mobile}
              followUpDate={callLogApp.followUpDate}
              onLogged={handleCallLogged}
          />
        )}
      </Suspense>

      <ApplicationHistoryModal 
          isOpen={isHistoryOpen}
          setIsOpen={setIsHistoryOpen}
          historyData={appHistory}
          loadingHistory={loadingHistory}
      />
      </>
      )}
    </>
  );
}
