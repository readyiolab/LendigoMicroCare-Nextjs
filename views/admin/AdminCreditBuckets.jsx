import React, { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Layers, Save, RefreshCw, History } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const BUCKET_LABELS = {
  bucket_fresh: 'Fresh',
  bucket_repeat: 'Repeat',
  bucket_sanctional: 'Sanctional',
};

function humanizeRole(code) {
  return String(code || '')
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function historyActor(row) {
  if (!Number(row.assigned_by) || row.actor_role === 'system') {
    return { name: 'System', role: 'System' };
  }
  const code = row.actor_role || row.assigned_by_role_code;
  const role = code && code === row.assigned_by_role_code && row.assigned_by_role_name
    ? row.assigned_by_role_name
    : humanizeRole(code);
  return { name: row.assigned_by_name || `Admin #${row.assigned_by}`, role: role || '—' };
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-indigo-600' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export default function AdminCreditBuckets() {
  const [managers, setManagers] = useState([]);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [tab, setTab] = useState('buckets');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [banner, setBanner] = useState({ type: '', text: '' });
  const [bucketFilter, setBucketFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadBuckets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCreditBuckets();
      if (res?.status === 1) {
        setManagers(res.data?.managers || []);
      }
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Failed to load credit buckets' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await adminAPI.getCreditAllocationHistory({
        page,
        limit: 30,
        bucket: bucketFilter || undefined,
        search: search || undefined,
      });
      if (res?.status === 1) {
        setHistory(res.data?.history || []);
        setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Failed to load allocation history' });
    } finally {
      setHistoryLoading(false);
    }
  }, [bucketFilter, search]);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  useEffect(() => {
    if (tab === 'history') loadHistory(1);
  }, [tab, loadHistory]);

  const toggleBucket = (index, key) => {
    setManagers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: next[index][key] ? 0 : 1 };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setBanner({ type: '', text: '' });
    try {
      const rows = managers.map((m) => ({
        adminId: m.id,
        bucketFresh: !!Number(m.bucket_fresh),
        bucketRepeat: !!Number(m.bucket_repeat),
        bucketSanctional: !!Number(m.bucket_sanctional),
      }));
      const res = await adminAPI.updateCreditBuckets({ rows });
      if (res?.status === 1) {
        setBanner({
          type: 'success',
          text: 'Credit bucket labels saved. Submitted cases are still split equally across all active credit managers.',
        });
        loadBuckets();
      } else {
        setBanner({ type: 'error', text: res?.message || 'Save failed' });
      }
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleRebalance = async () => {
    setRebalancing(true);
    setBanner({ type: '', text: '' });
    try {
      const res = await adminAPI.rebalanceCreditBuckets();
      if (res?.status === 1) {
        const count = res.data?.reassignedCount || 0;
        if (count > 0) {
          setBanner({
            type: 'success',
            text: `Moved ${count} open case(s) from inactive credit managers to the active managers with the lightest queue.`,
          });
        } else {
          setBanner({
            type: 'success',
            text: 'All open cases are already with active credit managers. Nothing needed moving.',
          });
        }
        await loadBuckets();
        if (tab === 'history') await loadHistory(1);
      } else {
        setBanner({ type: 'error', text: res?.message || 'Rebalance failed' });
      }
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Rebalance failed' });
    } finally {
      setRebalancing(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            Credit bucket management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submitted cases are split equally across all active Credit Managers. Drafts are assigned by Super Admin only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (tab === 'buckets' ? loadBuckets() : loadHistory(pagination.page))}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', (loading || historyLoading || rebalancing) && 'animate-spin')} />
          </button>
          {tab === 'buckets' && (
            <>
              <button
                type="button"
                onClick={handleRebalance}
                disabled={rebalancing || saving || loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 disabled:opacity-50"
                title="Move open cases held by deactivated credit managers to active ones"
              >
                {rebalancing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="w-4 h-4" />}
                Reassign cases from inactive managers
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || rebalancing || loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('buckets')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            tab === 'buckets' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
          )}
        >
          Bucket toggles
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-1.5',
            tab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
          )}
        >
          <History className="w-4 h-4" />
          Allocation history
        </button>
      </div>

      {banner.text && (
        <div
          className={cn(
            'rounded-lg px-4 py-3 text-sm border',
            banner.type === 'error'
              ? 'bg-red-50 border-red-100 text-red-800'
              : 'bg-emerald-50 border-emerald-100 text-emerald-800'
          )}
        >
          {banner.text}
        </div>
      )}

      {tab === 'buckets' && (
        loading ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Spinner className="h-4 w-4" />
            Loading credit managers…
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Credit Manager</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Mobile</th>
                  {Object.entries(BUCKET_LABELS).map(([key, label]) => (
                    <th key={key} className="px-4 py-3 text-center">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managers.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{m.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{m.mobile || '—'}</td>
                    {Object.keys(BUCKET_LABELS).map((key) => (
                      <td key={key} className="px-4 py-3 text-center">
                        <Toggle
                          checked={!!Number(m[key])}
                          onChange={() => toggleBucket(idx, key)}
                          label={`${m.full_name} ${BUCKET_LABELS[key]}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {!managers.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No active credit managers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All buckets</option>
              <option value="fresh">Fresh</option>
              <option value="repeat">Repeat</option>
              <option value="sanctional">Sanctional</option>
            </select>
            <input
              type="search"
              placeholder="Search lead / application no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[220px]"
            />
            <button
              type="button"
              onClick={() => loadHistory(1)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
            >
              Apply filters
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            {historyLoading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Spinner className="h-4 w-4" />
                Loading history…
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Application</th>
                    <th className="px-4 py-3">Bucket</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To</th>
                    <th className="px-4 py-3">Changed by</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((row) => {
                    const actor = historyActor(row);
                    return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{row.application_number || row.lead_id || row.loan_application_id}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.bucket_code}</td>
                      <td className="px-4 py-3 text-slate-600">{row.previous_admin_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-900">{row.new_admin_name || row.new_admin_id}</td>
                      <td className="px-4 py-3 text-slate-900">{actor.name}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{actor.role}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={row.reason}>{row.reason || '—'}</td>
                    </tr>
                    );
                  })}
                  {!history.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No allocation history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => loadHistory(pagination.page - 1)}
                  className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadHistory(pagination.page + 1)}
                  className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
