import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from '@/lib/router';
import {
  AlertTriangle,
  TrendingUp,
  FileBarChart2,
  HandCoins,
  Scale,
  ClipboardCheck,
  CalendarClock,
  Users,
  X,
} from 'lucide-react';
import { collectionAPI } from '@/lib/api/collection';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import CollectionPageHeader from '@/components/admin/collections/shared/CollectionPageHeader';
import { collectionUi } from '@/components/admin/collections/shared/collectionUi';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';

const CollectionDashboard = lazy(() => import('@/components/admin/collections/CollectionDashboard'));
const OverdueTable = lazy(() => import('@/components/admin/collections/OverdueTable'));
const CollectionReport = lazy(() => import('@/components/admin/collections/CollectionReport'));
const PTPTracker = lazy(() => import('@/components/admin/collections/PTPTracker'));
const SettlementPanel = lazy(() => import('@/components/admin/collections/SettlementPanel'));
const BureauPanel = lazy(() => import('@/components/admin/collections/BureauPanel'));
const CollectionPunchModal = lazy(() => import('@/components/admin/collections/CollectionPunchModal'));
const CollectionApprovalPanel = lazy(() => import('@/components/admin/collections/CollectionApprovalPanel'));
const TodayWorkPanel = lazy(() => import('@/components/admin/collections/TodayWorkPanel'));
const BucketAllocatePanel = lazy(() => import('@/components/admin/collections/BucketAllocatePanel'));

import {
  ContactModal,
  PenaltyModal,
  AddRemarkModal,
  ViewRemarksModal,
} from '@/components/admin/collections/CollectionModals';

const VALID_TABS = [
  'dashboard',
  'today',
  'overdue',
  'ptp',
  'settlements',
  'approval',
  'allocate',
  'bureau',
  'report',
];

/** Due-date workflow buckets; they never combine with a pending-in-period date range */
const DUE_WINDOW_BUCKETS = ['due-today', 'pre-due-3'];

function fmtDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Match backend getCollectionDashboard period bounds (iso week / month / custom). */
function dashboardPeriodBounds(period, customStart, customEnd) {
  if (period === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay(); // 0 Sun … 6 Sat
    const isoOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + isoOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startDate: fmtDate(start), endDate: fmtDate(end) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

function addDaysIso(baseIso, days) {
  const d = new Date(`${baseIso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

export default function AdminCollections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [overdueData, setOverdueData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  const [todayMyQueue, setTodayMyQueue] = useState(false);

  const [dashPeriod, setDashPeriod] = useState('month');
  const [dashCustomStart, setDashCustomStart] = useState('');
  const [dashCustomEnd, setDashCustomEnd] = useState('');

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    dpdBucket: '',
    visitRequired: false,
    myQueue: false,
    loanLevel: false,
    startDate: '',
    endDate: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef(null);

  const [contactModal, setContactModal] = useState(null);
  const [remarkModal, setRemarkModal] = useState(null);
  const [remarksViewModal, setRemarksViewModal] = useState(null);
  const [penaltyModal, setPenaltyModal] = useState(null);
  const [collectionPunchLoanId, setCollectionPunchLoanId] = useState(null);

  const [remarkForm, setRemarkForm] = useState({
    remark: '',
    remarkType: 'general',
    nextFollowUpDate: '',
    promiseAmount: '',
  });
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);

  const fetchDashboard = useCallback(async (period, customStart, customEnd) => {
    const activePeriod = period ?? dashPeriod;
    const params = { period: activePeriod };
    if (activePeriod === 'custom') {
      params.startDate = customStart ?? dashCustomStart;
      params.endDate = customEnd ?? dashCustomEnd;
    }
    try {
      const response = await collectionAPI.getCollectionDashboard(params);
      if (response.status === 1) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, [dashPeriod, dashCustomStart, dashCustomEnd]);

  const fetchOverdue = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
        minDaysOverdue: 0,
        _t: Date.now(),
      };
      if (filters.search?.trim()) params.search = filters.search.trim();
      if (filters.dpdBucket) params.dpdBucket = filters.dpdBucket;
      if (filters.visitRequired) params.visitRequired = 'true';
      if (filters.myQueue) params.myQueue = 'true';
      if (filters.loanLevel) params.loanLevel = 'true';
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await collectionAPI.getOverdueRepayments(params);
      if (response.status === 1) {
        setOverdueData(response.data);
        setError('');
      } else {
        setError(response.message || 'Failed to fetch overdue repayments');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch overdue repayments');
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.limit,
    filters.search,
    filters.dpdBucket,
    filters.visitRequired,
    filters.myQueue,
    filters.loanLevel,
    filters.startDate,
    filters.endDate,
  ]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilters((f) => {
        if (f.search === searchInput) return f;
        return { ...f, search: searchInput, page: 1 };
      });
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await collectionAPI.generateOverdueReport();
      if (response.status === 1) {
        setReportData(response.data);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const loanId = searchParams.get('loanId');
    const myQueue = searchParams.get('myQueue');
    const visitRequired = searchParams.get('visitRequired');
    const dueToday = searchParams.get('dueToday');
    const dpdBucket = searchParams.get('dpdBucket') || '';
    const urlStartDate = searchParams.get('startDate') || '';
    const urlEndDate = searchParams.get('endDate') || '';

    if (tab && VALID_TABS.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    if (loanId && (tab === 'overdue' || !tab)) {
      setSearchInput(loanId);
      setFilters((f) => ({ ...f, search: loanId, page: 1 }));
    }
    if (myQueue === 'true') {
      setFilters((f) => ({ ...f, myQueue: true, page: 1 }));
      setTodayMyQueue(true);
    }
    if (visitRequired === 'true') {
      setFilters((f) => ({ ...f, visitRequired: true, page: 1 }));
    }
    if (tab === 'overdue') {
      const dueWindow = DUE_WINDOW_BUCKETS.includes(dpdBucket);
      const startDate = dueWindow ? '' : urlStartDate;
      const endDate = dueWindow ? '' : urlEndDate;
      setFilters((f) => {
        const next = {
          ...f,
          dpdBucket,
          startDate,
          endDate,
          page: f.dpdBucket === dpdBucket && f.startDate === startDate && f.endDate === endDate
            ? f.page
            : 1,
        };
        if (
          f.dpdBucket === next.dpdBucket &&
          f.startDate === next.startDate &&
          f.endDate === next.endDate &&
          f.page === next.page
        ) {
          return f;
        }
        return next;
      });
    }
    if (dueToday === 'true' && tab === 'ptp') {
      // PTPTracker reads dueToday from its own props / URL via parent later
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'overdue') fetchOverdue();
    if (activeTab === 'report') {
      fetchReport();
      fetchDashboard();
    }
  }, [activeTab, fetchDashboard, fetchOverdue, fetchReport]);

  const handleDashPeriodChange = useCallback((period, customStart, customEnd) => {
    setDashPeriod(period);
    if (customStart) setDashCustomStart(customStart);
    if (customEnd) setDashCustomEnd(customEnd);
    fetchDashboard(period, customStart, customEnd);
  }, [fetchDashboard]);

  const handleTabChange = useCallback((tabId, extraParams = {}) => {
    setActiveTab(tabId);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    if (tabId !== 'overdue') {
      next.delete('loanId');
      next.delete('dpdBucket');
      next.delete('startDate');
      next.delete('endDate');
    }
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v == null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Bucket / date changes on the list: keep state and URL in step (the URL effect re-applies them)
  const applyOverdueFilters = useCallback((patch) => {
    const next = { ...filters, ...patch, page: 1 };
    if (DUE_WINDOW_BUCKETS.includes(next.dpdBucket)) {
      if (patch.startDate || patch.endDate) {
        next.dpdBucket = '';
      } else {
        next.startDate = '';
        next.endDate = '';
      }
    }
    setFilters(next);
    handleTabChange('overdue', {
      dpdBucket: next.dpdBucket,
      startDate: next.startDate,
      endDate: next.endDate,
    });
  }, [filters, handleTabChange]);

  const handleKpiClick = useCallback((kpiKey) => {
    const clearListParams = {
      dpdBucket: '',
      startDate: '',
      endDate: '',
      visitRequired: '',
    };

    if (kpiKey === 'pending') {
      const fromDash = dashboardData?.periodStart && dashboardData?.periodEnd
        ? { startDate: dashboardData.periodStart, endDate: dashboardData.periodEnd }
        : dashboardPeriodBounds(dashPeriod, dashCustomStart, dashCustomEnd);
      setFilters((f) => ({
        ...f,
        dpdBucket: '',
        visitRequired: false,
        startDate: fromDash.startDate,
        endDate: fromDash.endDate,
        page: 1,
      }));
      handleTabChange('overdue', {
        ...clearListParams,
        startDate: fromDash.startDate,
        endDate: fromDash.endDate,
      });
      return;
    }

    if (kpiKey === 'dueToday') {
      setFilters((f) => ({
        ...f,
        dpdBucket: 'due-today',
        visitRequired: false,
        startDate: '',
        endDate: '',
        page: 1,
      }));
      handleTabChange('overdue', {
        ...clearListParams,
        dpdBucket: 'due-today',
      });
      return;
    }

    if (kpiKey === 'overdue') {
      setFilters((f) => ({
        ...f,
        dpdBucket: '',
        visitRequired: false,
        startDate: '',
        endDate: '',
        page: 1,
      }));
      handleTabChange('overdue', clearListParams);
      return;
    }

    if (kpiKey === 'upcoming7') {
      const today = fmtDate(new Date());
      const start = addDaysIso(today, 1);
      const end = addDaysIso(today, 7);
      setFilters((f) => ({
        ...f,
        dpdBucket: '',
        visitRequired: false,
        startDate: start,
        endDate: end,
        page: 1,
      }));
      handleTabChange('overdue', {
        ...clearListParams,
        startDate: start,
        endDate: end,
      });
    }
  }, [
    dashboardData,
    dashPeriod,
    dashCustomStart,
    dashCustomEnd,
    handleTabChange,
  ]);

  const handleWorkflowAlert = useCallback((alertKey) => {
    if (alertKey === 'ptpDueToday') {
      handleTabChange('ptp', { dueToday: 'true' });
      return;
    }
    if (alertKey === 'settlementsPending') {
      handleTabChange('settlements');
      return;
    }
    if (alertKey === 'visitRequired') {
      handleTabChange('overdue', { visitRequired: 'true' });
      setFilters((f) => ({ ...f, visitRequired: true, page: 1 }));
      return;
    }
    if (alertKey === 'punchesPending') {
      handleTabChange('approval');
      return;
    }
    if (alertKey === 'portfolioPending') {
      handleTabChange('overdue');
      return;
    }
    handleTabChange('today');
  }, [handleTabChange]);

  const handleViewContact = useCallback(async (userId) => {
    setContactModal({ loading: true });
    try {
      const response = await collectionAPI.getBorrowerContact(userId);
      if (response.status === 1) {
        setContactModal(response.data);
      } else {
        setContactModal(null);
        setError(response.message || 'Failed to fetch contact');
      }
    } catch (err) {
      setContactModal(null);
      setError(err.message || 'Failed to fetch contact');
    }
  }, []);

  const handleViewPenalty = useCallback(async (rowOrId) => {
    const row = rowOrId && typeof rowOrId === 'object' ? rowOrId : null;
    const repaymentId = row?.repayment_id || rowOrId;
    if (!repaymentId && !row) return;

    if (row) {
      setPenaltyModal({
        applicationNumber: row.loan_account_number || row.application_number,
        dueDate: row.due_date,
        principalAmount: row.principal_due,
        daysOverdue: Math.max(0, Number(row.days_overdue) || 0),
        daysUntilDue: row.days_until_due || 0,
        collectionStage: row.collection_stage,
        totalPenalty: row.calculated_penalty,
        totalDue: row.total_due_with_penalty,
        penaltyRate: row.penalty_rate || '2% / day',
      });
      return;
    }

    setPenaltyModal({ loading: true });
    try {
      const response = await collectionAPI.getPenaltyDetails(repaymentId);
      if (response.status === 1) {
        setPenaltyModal(response.data);
      } else {
        setPenaltyModal(null);
        setError(response.message || 'Failed to fetch penalty details');
      }
    } catch (err) {
      setPenaltyModal(null);
      setError(err.message || 'Failed to fetch penalty details');
    }
  }, []);

  const handleViewRemarks = useCallback(async (loanApplicationId) => {
    setRemarksViewModal({ loanApplicationId, remarks: [], loading: true });
    try {
      const response = await collectionAPI.getCollectionRemarks(loanApplicationId);
      if (response.status === 1) {
        setRemarksViewModal({ loanApplicationId, remarks: response.data });
      } else {
        setRemarksViewModal(null);
        setError(response.message || 'Failed to fetch remarks');
      }
    } catch (err) {
      setRemarksViewModal(null);
      setError(err.message || 'Failed to fetch remarks');
    }
  }, []);

  const handleAddRemark = useCallback(async () => {
    if (!remarkForm.remark.trim() || !remarkModal) return;
    setRemarkSubmitting(true);
    try {
      await collectionAPI.addCollectionRemark({
        loanApplicationId: remarkModal.loan_application_id,
        userId: remarkModal.user_id,
        remark: remarkForm.remark,
        remarkType: remarkForm.remarkType,
        nextFollowUpDate: remarkForm.nextFollowUpDate || undefined,
        promiseAmount: remarkForm.promiseAmount
          ? parseFloat(remarkForm.promiseAmount)
          : undefined,
        createPtp: remarkForm.remarkType === 'promise_to_pay',
      });
      setRemarkModal(null);
      setRemarkForm({ remark: '', remarkType: 'general', nextFollowUpDate: '', promiseAmount: '' });
      fetchOverdue();
    } catch (err) {
      setError(err.message || 'Failed to save disposition');
    } finally {
      setRemarkSubmitting(false);
    }
  }, [remarkForm, remarkModal, fetchOverdue]);

  const pendingApprovals = dashboardData?.workflow?.punchesPendingApproval || 0;

  const tabs = useMemo(() => [
    { id: 'dashboard', label: 'Overview', icon: TrendingUp },
    { id: 'today', label: "Today's Work", icon: CalendarClock },
    { id: 'overdue', label: 'Overdue Loans', icon: AlertTriangle },
    { id: 'ptp', label: 'Promise to pay', icon: HandCoins },
    {
      id: 'approval',
      label: pendingApprovals > 0 ? `Payments to approve (${pendingApprovals})` : 'Payments to approve',
      icon: ClipboardCheck,
    },
    { id: 'settlements', label: 'Settlements', icon: Scale },
    { id: 'allocate', label: 'Assign collectors', icon: Users },
    { id: 'bureau', label: 'Credit bureau report', icon: FileBarChart2 },
    { id: 'report', label: 'Reports', icon: FileBarChart2 },
  ], [pendingApprovals]);

  const currentDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const ptpDueToday = searchParams.get('dueToday') === 'true';

  return (
    <div className="space-y-4 pb-8">
      <CollectionPageHeader
        title="Collections"
        subtitle="Monitor overdue accounts, promises to pay, and settlement workflows"
        actions={
          <span className="text-xs text-slate-500 border border-slate-200 bg-slate-50 px-3 py-1.5">
            {currentDateStr}
          </span>
        }
      />

      {error && (
        <Alert variant="destructive" className="rounded-md border-red-200 bg-red-50 py-3">
          <AlertDescription className="text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <nav className={collectionUi.tabBar}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                collectionUi.tabBtn,
                'inline-flex items-center gap-2',
                active && collectionUi.tabBtnActive
              )}
            >
              <Icon className="w-4 h-4 opacity-70" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="relative min-h-[400px]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <Spinner className="w-8 h-8 text-primary" />
            </div>
          }
        >
          {activeTab === 'dashboard' && (
            <CollectionDashboard
              data={dashboardData}
              period={dashPeriod}
              customStart={dashCustomStart}
              customEnd={dashCustomEnd}
              onPeriodChange={handleDashPeriodChange}
              onRefresh={() => fetchDashboard()}
              onViewOverdueList={() => handleKpiClick('overdue')}
              onOpenReports={() => handleTabChange('report')}
              onWorkflowAlert={handleWorkflowAlert}
              onOpenTodayWork={() => handleTabChange('today')}
              onKpiClick={handleKpiClick}
            />
          )}
          {activeTab === 'today' && (
            <TodayWorkPanel
              myQueue={todayMyQueue}
              onToggleMyQueue={() => setTodayMyQueue((v) => !v)}
              onGoOverdue={(loanId) => {
                setSearchInput(loanId);
                setFilters((f) => ({ ...f, search: loanId, page: 1 }));
                handleTabChange('overdue', { loanId });
              }}
              onGoApproval={() => handleTabChange('approval')}
              onGoPtp={() => handleTabChange('ptp', { dueToday: 'true' })}
            />
          )}
          {activeTab === 'overdue' && (
            <OverdueTable
              data={overdueData}
              loading={loading}
              filters={filters}
              setFilters={setFilters}
              onFilterChange={applyOverdueFilters}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              onViewContact={handleViewContact}
              onViewPenalty={handleViewPenalty}
              onAddRemark={(item) => {
                setRemarkForm({
                  remark: '',
                  remarkType: 'general',
                  nextFollowUpDate: '',
                  promiseAmount: item.principal_due ? String(item.principal_due) : '',
                });
                setRemarkModal(item);
              }}
              onViewRemarks={handleViewRemarks}
              onCollect={(item) => setCollectionPunchLoanId(item.loan_application_id)}
            />
          )}
          {activeTab === 'ptp' && <PTPTracker dueToday={ptpDueToday} />}
          {activeTab === 'approval' && <CollectionApprovalPanel />}
          {activeTab === 'settlements' && <SettlementPanel />}
          {activeTab === 'allocate' && <BucketAllocatePanel />}
          {activeTab === 'bureau' && <BureauPanel />}
          {activeTab === 'report' && (
            <CollectionReport
              data={reportData}
              loading={loading}
              dashboardData={dashboardData}
            />
          )}
        </Suspense>
      </div>

      <ContactModal contact={contactModal} onClose={() => setContactModal(null)} />
      <PenaltyModal penalty={penaltyModal} onClose={() => setPenaltyModal(null)} />
      <AddRemarkModal
        remarkModal={remarkModal}
        remarkForm={remarkForm}
        setRemarkForm={setRemarkForm}
        onSubmit={handleAddRemark}
        submitting={remarkSubmitting}
        onClose={() => setRemarkModal(null)}
      />
      <ViewRemarksModal remarksData={remarksViewModal} onClose={() => setRemarksViewModal(null)} />
      <Suspense fallback={null}>
        {collectionPunchLoanId && (
          <CollectionPunchModal
            open={!!collectionPunchLoanId}
            onOpenChange={(open) => !open && setCollectionPunchLoanId(null)}
            loanApplicationId={collectionPunchLoanId}
            onSubmitted={() => fetchOverdue()}
          />
        )}
      </Suspense>
    </div>
  );
}
