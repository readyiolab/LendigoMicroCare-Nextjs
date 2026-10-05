import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, X } from 'lucide-react';
import { collectionAPI } from '@/lib/api/collection';
import { adminAPI } from '@/lib/api/admin';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 12;
const MIN_QUERY_LEN = 2;

const accentStyles = {
  indigo: {
    ring: 'focus:border-indigo-400',
    chip: 'bg-indigo-50 border-indigo-100 text-indigo-900',
    chipSub: 'text-indigo-600',
    hover: 'hover:bg-indigo-50',
    spinner: 'border-indigo-500',
  },
  amber: {
    ring: 'focus:border-amber-400',
    chip: 'bg-amber-50 border-amber-100 text-amber-900',
    chipSub: 'text-amber-600',
    hover: 'hover:bg-amber-50',
    spinner: 'border-amber-500',
  },
};

function normalizeLoanRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.loans)) return data.loans;
  if (Array.isArray(data?.applications)) return data.applications;
  return [];
}

function mapOverdueToLoan(row) {
  return {
    id: row.loan_application_id,
    application_number: row.application_number,
    full_name: row.borrower_name || row.full_name,
    mobile: row.contact_number || row.mobile,
    dpd: row.days_overdue || 0,
    total_outstanding: row.total_due_with_penalty || row.total_outstanding || 0,
  };
}

function mapAdminAppToLoan(app) {
  return {
    id: app.id,
    application_number: app.application_number,
    full_name: app.full_name,
    mobile: app.mobile,
    dpd: 0,
    total_outstanding: 0,
  };
}

function dedupeById(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    if (!r?.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

/**
 * Borrower search for PTP / Settlement modals.
 */
export default function CollectionLoanPicker({
  selectedLoan,
  onLoanSelected,
  onClear,
  accent = 'indigo',
  loadingDetails = false,
}) {
  const styles = accentStyles[accent] || accentStyles.indigo;
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [searchError, setSearchError] = useState('');
  const wrapRef = useRef(null);
  const abortRef = useRef(null);

  const isLocked = Boolean(selectedLoan?.loanApplicationId);

  useEffect(() => {
    if (isLocked) {
      setQuery(selectedLoan.applicationNumber || '');
      setSuggestions([]);
      setDropdownOpen(false);
    }
  }, [isLocked, selectedLoan?.applicationNumber, selectedLoan?.loanApplicationId]);

  const runSearch = useCallback(async (q) => {
    const term = q.trim();
    if (term.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setSearching(true);
    setSearchError('');

    try {
      let rows = [];

      const res = await collectionAPI.searchLoans(term, { signal });
      if (res?.status === 1) {
        rows = normalizeLoanRows(res.data);
      }

      if (!rows.length) {
        try {
          const overdueRes = await collectionAPI.getOverdueRepayments({
            search: term,
            minDaysOverdue: 0,
            limit: 15,
            page: 1,
          });
          if (overdueRes?.status === 1) {
            const list = overdueRes.data?.repayments || [];
            rows = (Array.isArray(list) ? list : []).map(mapOverdueToLoan);
          }
        } catch (e) {
          if (e.name !== 'AbortError') console.warn('Overdue search fallback:', e);
        }
      }

      if (!rows.length) {
        try {
          const appsRes = await adminAPI.getApplications(
            { search: term, limit: 10, page: 1 },
            { signal }
          );
          if (appsRes?.status === 1) {
            rows = (appsRes.data?.applications || []).map(mapAdminAppToLoan);
          }
        } catch (e) {
          if (e.name !== 'AbortError') console.warn('Applications search fallback:', e);
        }
      }

      rows = dedupeById(rows);
      setSuggestions(rows);
      setDropdownOpen(true);

      if (!rows.length) {
        setSearchError('No loans found. Try full mobile (10 digits), application ID, or borrower name.');
      }
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('Loan search error:', err);
        setSuggestions([]);
        setSearchError(err?.message || 'Search failed. Check connection and try again.');
        setDropdownOpen(true);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (isLocked) return;
    const term = query.trim();
    if (term.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    const timer = setTimeout(() => runSearch(term), 300);
    return () => clearTimeout(timer);
  }, [query, isLocked, runSearch]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        wrapRef.current?.contains(e.target) ||
        e.target.closest('[data-collection-loan-dropdown]')
      ) {
        return;
      }
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handlePick = async (loan) => {
    if (!loan?.id) return;
    setDropdownOpen(false);
    setSuggestions([]);
    setQuery(loan.application_number || String(loan.id));
    setPicking(true);
    try {
      const res = await collectionAPI.getSettlementDetails(loan.id);
      if (res?.status === 1) {
        onLoanSelected?.(res.data, loan);
      } else {
        setSearchError(res?.message || 'Could not load loan details.');
      }
    } catch (err) {
      console.error('Loan details error:', err);
      setSearchError('Could not load outstanding amount for this loan.');
    } finally {
      setPicking(false);
    }
  };

  const handleChangeBorrower = () => {
    setQuery('');
    setSuggestions([]);
    setDropdownOpen(false);
    setSearchError('');
    onClear?.();
  };

  const visible = suggestions.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, suggestions.length - MAX_VISIBLE);

  const dropdownPanel =
    dropdownOpen && query.trim().length >= MIN_QUERY_LEN ? (
      <div
        data-collection-loan-dropdown
        className="absolute left-0 right-0 top-full z-30 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden"
      >
        {searching && visible.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">Searching…</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">
            {searchError || 'No matching loans found.'}
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {visible.map((loan) => (
              <li key={loan.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(loan)}
                  className={cn(
                    'w-full text-left px-4 py-4 min-h-16 flex items-center justify-between gap-3 transition-colors',
                    styles.hover
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 truncate">
                      {loan.full_name || 'Borrower'}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {loan.application_number || `#${loan.id}`}
                      {loan.mobile ? ` · ${loan.mobile}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {loan.dpd > 0 && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {loan.dpd}d overdue
                      </span>
                    )}
                    <p className="text-xs font-semibold text-slate-700 mt-0.5 tabular-nums">
                      {loan.total_outstanding > 0
                        ? `₹${Math.round(loan.total_outstanding).toLocaleString('en-IN')}`
                        : 'Tap to load'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {hiddenCount > 0 && (
          <p className="px-4 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-100">
            +{hiddenCount} more — refine your search.
          </p>
        )}
      </div>
    ) : null;

  if (isLocked) {
    return (
      <div className={cn('rounded-lg border p-4', styles.chip)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                accent === 'amber' ? 'bg-amber-100' : 'bg-indigo-100'
              )}
            >
              <User className={cn('w-5 h-5', styles.chipSub)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {selectedLoan.borrowerName || 'Borrower'}
              </p>
              <p className={cn('text-xs font-medium truncate', styles.chipSub)}>
                {selectedLoan.applicationNumber}
                {selectedLoan.mobile ? ` · ${selectedLoan.mobile}` : ''}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Outstanding</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {loadingDetails || picking ? (
                <span className="inline-block w-16 h-5 bg-slate-200 animate-pulse rounded" />
              ) : (
                `₹${Number(selectedLoan.totalOutstanding || 0).toLocaleString('en-IN')}`
              )}
            </p>
          </div>
        </div>
        {(selectedLoan.principalOutstanding != null || selectedLoan.penaltyOutstanding != null) && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Principal</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                ₹{Number(selectedLoan.principalOutstanding || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Penalty</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                ₹{Number(selectedLoan.penaltyOutstanding || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleChangeBorrower}
          className="mt-3 text-xs font-semibold text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
        >
          Change borrower
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative z-20">
      <label className="text-xs font-medium text-slate-600 block mb-1.5">
        Search borrower / loan ID <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchError('');
            if (e.target.value.trim().length >= MIN_QUERY_LEN) {
              setDropdownOpen(true);
            }
          }}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LEN) {
              setDropdownOpen(true);
              if (!suggestions.length && !searching) runSearch(query.trim());
            }
          }}
          placeholder="Mobile, name, application #, or loan id"
          className={cn(
            'w-full h-11 rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-200',
            styles.ring
          )}
          autoComplete="off"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div
              className={cn(
                'w-4 h-4 border-2 border-t-transparent rounded-full animate-spin',
                styles.spinner
              )}
            />
          </div>
        )}
        {!searching && query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setDropdownOpen(false);
              setSearchError('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">Type 2+ characters (e.g. full mobile or UPGOR…)</p>

      {searchError && !searching && !visible.length && query.trim().length >= MIN_QUERY_LEN && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
          {searchError}
        </p>
      )}

      {dropdownPanel}
    </div>
  );
}
