import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Search, Filter, RefreshCw, Download, Phone, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/utils/statusUtils';
import { isCustomerHistoryQuery, isLoanAccountQuery } from '@/utils/customerIdentity';

const statusLabels = STATUS_LABELS;

const SEARCH_COMMIT_MS = 300;
// CUS000123 is already a valid identity while the user may still be typing "-LM01"; give it longer before redirecting
const IDENTITY_COMMIT_MS = 700;

const QUICK_STATUS_FILTERS = [
  { id: 'all', label: 'All', countKeys: ['all'] },
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'recommended', label: 'Recommended' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'approved', label: 'Sanction' },
  { id: 'disbursed', label: 'Disbursed' },
  { id: 'payment_pending', label: 'Ready for payout' },
];

// Non-telecaller roles work the post-recommendation pipeline.
const PIPELINE_STATUS_FILTERS = [
  { id: 'all', label: 'All', countKeys: ['all'] },
  { id: 'submitted', label: 'Submitted', countKeys: ['submitted'] },
  { id: 'recommended', label: 'Recommended', countKeys: ['recommended'] },
  { id: 'approved', label: 'Sanctioned', countKeys: ['approved'] },
  { id: 'offer_sent', label: 'Offer Sent', countKeys: ['offer_sent'] },
  { id: 'video_declaration_submitted', label: 'Video Submitted', countKeys: ['video_declaration_submitted'] },
  { id: 'esign_pending', label: 'eSign Pending', countKeys: ['esign_pending'] },
  { id: 'emandate', label: 'eMandate', countKeys: ['mandate_pending', 'esign_completed'] },
  { id: 'payment_pending', label: 'Ready for payout', countKeys: ['payment_pending'] },
  { id: 'failed', label: 'Rejected', countKeys: ['failed'] },
];

// Same hues as STATUS_BADGE_CONFIG so a chip matches the badge its rows show in the table.
// Class strings are written out in full so Tailwind keeps them.
const CHIP_TONES = {
  slate: {
    idle: 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
    active: 'border-slate-700 bg-slate-700 text-white',
    badge: 'bg-slate-600 text-white',
    badgeActive: 'bg-white text-slate-700',
  },
  gray: {
    idle: 'border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100',
    active: 'border-gray-500 bg-gray-500 text-white',
    badge: 'bg-gray-500 text-white',
    badgeActive: 'bg-white text-gray-700',
  },
  blue: {
    idle: 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100',
    active: 'border-blue-600 bg-blue-600 text-white',
    badge: 'bg-blue-600 text-white',
    badgeActive: 'bg-white text-blue-700',
  },
  indigo: {
    idle: 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100',
    active: 'border-indigo-600 bg-indigo-600 text-white',
    badge: 'bg-indigo-600 text-white',
    badgeActive: 'bg-white text-indigo-700',
  },
  green: {
    idle: 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100',
    active: 'border-green-600 bg-green-600 text-white',
    badge: 'bg-green-600 text-white',
    badgeActive: 'bg-white text-green-700',
  },
  cyan: {
    idle: 'border-cyan-300 text-cyan-700 bg-cyan-50 hover:bg-cyan-100',
    active: 'border-cyan-600 bg-cyan-600 text-white',
    badge: 'bg-cyan-600 text-white',
    badgeActive: 'bg-white text-cyan-700',
  },
  amber: {
    idle: 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100',
    active: 'border-amber-500 bg-amber-500 text-white',
    badge: 'bg-amber-500 text-white',
    badgeActive: 'bg-white text-amber-700',
  },
  pink: {
    idle: 'border-pink-300 text-pink-700 bg-pink-50 hover:bg-pink-100',
    active: 'border-pink-600 bg-pink-600 text-white',
    badge: 'bg-pink-600 text-white',
    badgeActive: 'bg-white text-pink-700',
  },
  violet: {
    idle: 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100',
    active: 'border-violet-600 bg-violet-600 text-white',
    badge: 'bg-violet-600 text-white',
    badgeActive: 'bg-white text-violet-700',
  },
  yellow: {
    idle: 'border-yellow-400 text-yellow-800 bg-yellow-50 hover:bg-yellow-100',
    active: 'border-yellow-500 bg-yellow-500 text-white',
    badge: 'bg-yellow-500 text-white',
    badgeActive: 'bg-white text-yellow-700',
  },
  red: {
    idle: 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100',
    active: 'border-red-600 bg-red-600 text-white',
    badge: 'bg-red-600 text-white',
    badgeActive: 'bg-white text-red-700',
  },
  purple: {
    idle: 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100',
    active: 'border-purple-600 bg-purple-600 text-white',
    badge: 'bg-purple-600 text-white',
    badgeActive: 'bg-white text-purple-700',
  },
};

const CHIP_TONE_BY_ID = {
  all: 'slate',
  draft: 'gray',
  submitted: 'blue',
  pending_pd: 'purple',
  recommended: 'indigo',
  approved: 'green',
  offer_sent: 'cyan',
  video_declaration_submitted: 'amber',
  esign_pending: 'pink',
  emandate: 'violet',
  payment_pending: 'yellow',
  disbursed: 'green',
  rejected: 'red',
  failed: 'red',
};

function chipToneFor(chip) {
  return CHIP_TONES[CHIP_TONE_BY_ID[chip.id]] || CHIP_TONES.slate;
}

const PD_PENDING_CHIP = { id: 'pending_pd', label: 'PD Pending', countKeys: ['pending_pd'] };
const PD_PENDING_ROLES = new Set(['credit_manager', 'underwriter', 'approver']);

function statusChipsForRole(role) {
  const base = role === 'telecaller' ? QUICK_STATUS_FILTERS : PIPELINE_STATUS_FILTERS;
  if (!PD_PENDING_ROLES.has(role)) return base;
  const afterSubmitted = base.findIndex((chip) => chip.id === 'submitted');
  if (afterSubmitted === -1) return [PD_PENDING_CHIP, ...base];
  return [
    ...base.slice(0, afterSubmitted + 1),
    PD_PENDING_CHIP,
    ...base.slice(afterSubmitted + 1),
  ];
}

function chipCountFor(chip, statusCounts) {
  if (!statusCounts) return null;
  const keys = chip.countKeys || [chip.id];
  const present = keys.filter((k) => statusCounts[k] != null);
  if (present.length === 0) return null;
  return present.reduce((sum, k) => sum + Number(statusCounts[k] || 0), 0);
}

/** Extensible list filters (URL `disbursal=` etc.) — stack with status chips. */
const QUICK_LIST_FILTERS = [
  { id: 'latest', label: 'Latest Disbursal', param: 'disbursal' },
];

function ApplicationFilters({
  listView,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  statusCounts,
  filteredCount,
  currentAdminRole,
  teleStats,
  loading,
  handleDownloadMIS,
  showMISMenu,
  setShowMISMenu,
  refresh,
  refreshing,
  onClearFilters,
  onSearchSubmit,
  disbursalFilter = '',
  setDisbursalFilter,
  dateFrom = '',
  setDateFrom,
  dateTo = '',
  setDateTo,
  stateFilter = '',
  setStateFilter,
  states = [],
  onStateFocus,
  loadingStates = false,
  creditManagerFilter = '',
  setCreditManagerFilter,
  creditManagers = [],
  onCreditManagerFocus,
  loadingCreditManagers = false,
  onClearAllFilters,
}) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterPanelRef = useRef(null);
  const filterBtnRef = useRef(null);
  const title = listView?.title || 'All Applications';
  const count = filteredCount ?? Object.values(statusCounts || {}).reduce((a, b) => a + b, 0);
  const showCmFilter = currentAdminRole !== 'credit_manager' && typeof setCreditManagerFilter === 'function';

  // Keystrokes stay local; only a settled value is committed to the parent (URL), so typing never re-renders the table
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const commitTimerRef = useRef(null);
  const lastCommittedRef = useRef((searchQuery || '').trim());

  const clearCommitTimer = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  }, []);

  // External changes (Clear filters, back/forward) replace the box; our own commits echo back and are ignored
  useEffect(() => {
    const external = (searchQuery || '').trim();
    if (external === lastCommittedRef.current) return;
    lastCommittedRef.current = external;
    clearCommitTimer();
    setInputValue(external);
  }, [searchQuery, clearCommitTimer]);

  useEffect(() => clearCommitTimer, [clearCommitTimer]);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    clearCommitTimer();
    const trimmed = value.trim();
    const wait = isCustomerHistoryQuery(trimmed) || isLoanAccountQuery(trimmed) ? IDENTITY_COMMIT_MS : SEARCH_COMMIT_MS;
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      if (trimmed === lastCommittedRef.current) return;
      lastCommittedRef.current = trimmed;
      setSearchQuery?.(trimmed);
    }, wait);
  }, [clearCommitTimer, setSearchQuery]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return;
    clearCommitTimer();
    const trimmed = inputValue.trim();
    lastCommittedRef.current = trimmed;
    if (onSearchSubmit) onSearchSubmit(trimmed);
    else setSearchQuery?.(trimmed);
  }, [clearCommitTimer, inputValue, onSearchSubmit, setSearchQuery]);

  // Count active extra filters for badge
  const activeFilterCount = [
    statusFilter && statusFilter !== 'all' ? 1 : 0,
    dateFrom ? 1 : 0,
    dateTo ? 1 : 0,
    stateFilter ? 1 : 0,
    creditManagerFilter ? 1 : 0,
    disbursalFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const hasExtraFilters = Boolean(
    disbursalFilter || dateFrom || dateTo || stateFilter || creditManagerFilter
  );

  // Click-outside detection — close the panel when clicking outside
  useEffect(() => {
    if (!showFilterPanel) return;
    function handleClickOutside(e) {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(e.target) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(e.target)
      ) {
        setShowFilterPanel(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

  // In-panel clear handler — clears all filters in one URL update (one request)
  const handlePanelClear = useCallback(() => {
    if (typeof onClearAllFilters === 'function') {
      onClearAllFilters();
      return;
    }
    if (typeof setStatusFilter === 'function') {
      const defaultStatus = currentAdminRole === 'telecaller' ? 'incomplete' : 'all';
      setStatusFilter(defaultStatus);
    }
    if (typeof setDateFrom === 'function') setDateFrom('');
    if (typeof setDateTo === 'function') setDateTo('');
    if (typeof setStateFilter === 'function') setStateFilter('');
    if (typeof setCreditManagerFilter === 'function') setCreditManagerFilter('');
    if (typeof setDisbursalFilter === 'function') setDisbursalFilter('');
  }, [setStatusFilter, setDateFrom, setDateTo, setStateFilter, setCreditManagerFilter, setDisbursalFilter, onClearAllFilters, currentAdminRole]);

  return (
    <div className="space-y-3">
      {currentAdminRole === 'telecaller' && teleStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Calls today</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl text-slate-900 font-semibold tabular-nums">{teleStats.callsToday}</h3>
                <span className="text-xs text-slate-400">/ {teleStats.dailyTarget}</span>
              </div>
            </div>
            <Phone className="h-5 w-5 text-slate-400" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Conversions</p>
              <h3 className="text-xl text-emerald-700 font-semibold tabular-nums">{teleStats.conversionsToday}</h3>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Daily target</p>
              <h3 className="text-xl text-slate-900 font-semibold tabular-nums">
                {Math.round((teleStats.callsToday / (teleStats.dailyTarget || 50)) * 100)}%
              </h3>
            </div>
            <RefreshCw className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      )}

      {listView?.hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-2 text-sm bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
          <span className="font-medium text-slate-700">{listView.title}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 text-xs">{listView.subtitle}</span>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Reference-style toolbar */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight whitespace-nowrap">
          {title}
        </h1>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={inputValue}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Customer ID, PAN, Lead, mobile"
              className="h-9 w-52 sm:w-64 pl-8 pr-3 rounded-md border-slate-300 text-[13px] placeholder:text-slate-400 bg-white focus-visible:ring-1 focus-visible:ring-slate-400"
            />
          </div>

          {/* Filter toggle button with active badge */}
          <div className="relative">
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setShowFilterPanel((v) => !v)}
              className={cn(
                'h-9 w-9 inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors relative',
                (showFilterPanel || activeFilterCount > 0) && 'border-sky-400 text-sky-700 bg-sky-50'
              )}
              title="Filter"
              aria-label="Filter"
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-sky-600 text-white text-[10px] font-bold leading-none px-1">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter panel — stays open until toggled or click-outside */}
            {showFilterPanel && (
              <div
                ref={filterPanelRef}
                className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-lg p-4 max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* Panel header with clear button */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-bold text-slate-800">Filters</p>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handlePanelClear}
                      className="flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-800 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear all
                    </button>
                  )}
                </div>

                {/* Status filter */}
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                >
                  <option value="all">All statuses</option>
                  {currentAdminRole === 'telecaller' ? (
                    <option value="incomplete">Incomplete (need Fill)</option>
                  ) : (
                    <>
                      <option value="emandate">e-Mandate</option>
                      <option value="failed">Rejected (incl. offer / video / mandate)</option>
                    </>
                  )}
                  {Object.entries(statusLabels).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>

                {/* Date range filter */}
                {setDateFrom && setDateTo && (
                  <>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-3.5 mb-1.5">Created date</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5 block">From</label>
                        <Input
                          type="date"
                          value={dateFrom || ''}
                          max={dateTo || undefined}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-9 text-[12px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5 block">To</label>
                        <Input
                          type="date"
                          value={dateTo || ''}
                          min={dateFrom || undefined}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-9 text-[12px]"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* State filter */}
                {setStateFilter && (
                  <>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-3.5 mb-1.5">State</p>
                    <select
                      value={stateFilter || ''}
                      onFocus={() => onStateFocus?.()}
                      onClick={() => onStateFocus?.()}
                      onChange={(e) => setStateFilter(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="">{loadingStates ? 'Loading states…' : 'All states'}</option>
                      {states.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </>
                )}

                {/* Credit manager filter */}
                {showCmFilter && (
                  <>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-3.5 mb-1.5">Credit manager</p>
                    <select
                      value={creditManagerFilter || ''}
                      onFocus={() => onCreditManagerFocus?.()}
                      onClick={() => onCreditManagerFocus?.()}
                      onChange={(e) => setCreditManagerFilter(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="">{loadingCreditManagers ? 'Loading…' : 'All credit managers'}</option>
                      {creditManagers.map((cm) => (
                        <option key={cm.id} value={String(cm.id)}>{cm.fullName}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}
          </div>

          <span className="text-[13px] font-semibold text-slate-800 whitespace-nowrap">
            Applications: {loading && count === 0 ? '…' : count}
          </span>

          {currentAdminRole !== 'telecaller' && currentAdminRole !== 'credit_manager' && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowMISMenu(!showMISMenu)}
                className="h-9 gap-1.5 text-[12px] border-slate-300 px-2.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">MIS</span>
              </Button>
              {showMISMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
                  <button type="button" onClick={() => handleDownloadMIS('all')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">
                    All applications
                  </button>
                  <button type="button" onClick={() => handleDownloadMIS('pre_sanction')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">
                    Pre-sanction
                  </button>
                  <button type="button" onClick={() => handleDownloadMIS('post_disbursement')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700">
                    Post-disbursement
                  </button>
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => refresh()}
            className="h-9 w-9 p-0 border-slate-300"
            disabled={loading || refreshing}
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-slate-600', (loading || refreshing) && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-3 pt-2">
        {statusChipsForRole(currentAdminRole).map((chip) => {
          const isActive = statusFilter === chip.id;
          const chipCount = chipCountFor(chip, statusCounts);
          const tone = chipToneFor(chip);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={cn(
                'relative inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold border transition-colors',
                isActive ? cn(tone.active, 'shadow-sm') : tone.idle
              )}
            >
              {chip.label}
              {chipCount != null && (
                <span
                  className={cn(
                    'absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none tabular-nums ring-2 ring-white',
                    chipCount === 0
                      ? 'bg-slate-200 text-slate-500'
                      : isActive
                        ? cn(tone.badgeActive, 'shadow')
                        : tone.badge
                  )}
                >
                  {chipCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {typeof setDisbursalFilter === 'function' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            More filters
          </span>
          {QUICK_LIST_FILTERS.map((chip) => {
            const isActive = disbursalFilter === chip.id;
            return (
              <button
                key={`${chip.param}-${chip.id}`}
                type="button"
                onClick={() => setDisbursalFilter(isActive ? '' : chip.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold border transition-colors',
                  isActive
                    ? 'border-emerald-400 text-emerald-800 bg-emerald-50'
                    : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(ApplicationFilters);
