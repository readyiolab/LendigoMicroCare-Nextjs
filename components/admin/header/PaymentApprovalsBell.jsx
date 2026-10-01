import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/lib/router';
import {
  Bell, CheckCircle2, XCircle, Eye, ExternalLink, Loader2, RefreshCw, Wallet, UserRound,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collectionAPI } from '@/lib/api/collection';
import { adminAPI } from '@/lib/api/admin';
import socketService from '@/lib/services/socketService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

export const APPROVER_ROLES = new Set(['super_admin', 'operations_manager']);
export const PAYMENT_APPROVALS_REFRESH_EVENT = 'payment-approvals:refresh';
const SOCKET_EVENT = 'PAYMENT_APPROVALS_CHANGED';
const POLL_MS = 60 * 1000;

const TYPE_LABELS = {
  full_payment: 'Full payment',
  part_payment: 'Part payment',
  prepayment: 'Prepayment',
  settlement: 'Settlement',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'punch', label: 'Collections' },
  { id: 'proof', label: 'Customer proofs' },
];

const itemKey = (item) => `${item.kind}:${item.id}`;

function formatInr(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function timeAgo(value) {
  if (!value) return '';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(url || '') || /\/image\/upload\//i.test(url || '');
}

function errorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export default function PaymentApprovalsBell() {
  const { admin } = useAdminAuth();
  const role = String(admin?.role_code || admin?.role || '').toLowerCase();
  if (!APPROVER_ROLES.has(role)) return null;
  return <PaymentApprovalsBellInner />;
}

function PaymentApprovalsBellInner() {
  const navigate = useNavigate();
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState({ total: 0, punchCount: 0, proofCount: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [hidden, setHidden] = useState(() => new Set());
  const [busyKey, setBusyKey] = useState(null);
  const [rejectKey, setRejectKey] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewKey, setPreviewKey] = useState(null);
  const requestSeqRef = useRef(0);
  const socketTimerRef = useRef(null);

  const load = useCallback(async (force = false) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const res = await collectionAPI.getApprovalSummary({ force });
      if (seq !== requestSeqRef.current) return;
      if (res?.status === 1 && res.data) {
        setSummary(res.data);
        setHidden(new Set());
        setError('');
      }
    } catch (err) {
      if (seq === requestSeqRef.current) setError(errorMessage(err, 'Could not load payments to approve'));
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);

    const onSocket = () => {
      clearTimeout(socketTimerRef.current);
      socketTimerRef.current = setTimeout(() => load(true), 400);
    };
    const onWindowRefresh = () => load(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(false);
    };
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, POLL_MS);

    socketService.on(SOCKET_EVENT, onSocket);
    window.addEventListener(PAYMENT_APPROVALS_REFRESH_EVENT, onWindowRefresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      clearTimeout(socketTimerRef.current);
      socketService.off(SOCKET_EVENT, onSocket);
      window.removeEventListener(PAYMENT_APPROVALS_REFRESH_EVENT, onWindowRefresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) load(true);
    else {
      setRejectKey(null);
      setRejectReason('');
      setPreviewKey(null);
    }
  };

  const visibleItems = useMemo(
    () => (summary.items || []).filter(
      (item) => !hidden.has(itemKey(item)) && (filter === 'all' || item.kind === filter)
    ),
    [summary.items, hidden, filter]
  );

  const hiddenCounts = useMemo(() => {
    const counts = { punch: 0, proof: 0 };
    (summary.items || []).forEach((item) => {
      if (hidden.has(itemKey(item))) counts[item.kind] += 1;
    });
    return counts;
  }, [summary.items, hidden]);

  const punchCount = Math.max(0, Number(summary.punchCount || 0) - hiddenCounts.punch);
  const proofCount = Math.max(0, Number(summary.proofCount || 0) - hiddenCounts.proof);
  const total = punchCount + proofCount;
  const filterCount = { all: total, punch: punchCount, proof: proofCount };

  const hideItem = (key, value) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const runAction = async (item, action) => {
    const key = itemKey(item);
    setBusyKey(key);
    setError('');
    hideItem(key, true);
    try {
      let res;
      if (item.kind === 'punch') {
        res = action === 'approve'
          ? await collectionAPI.approveCollectionPunch(item.id, {})
          : await collectionAPI.rejectCollectionPunch(item.id, { reason: rejectReason.trim() });
      } else {
        res = await adminAPI.verifyRepayment(
          item.id,
          action === 'approve' ? { status: 'paid' } : { status: 'pending', reason: rejectReason.trim() }
        );
      }
      if (res && res.status !== undefined && res.status !== 1) {
        throw new Error(res.message || 'Action failed');
      }
      toast(
        action === 'approve' ? 'Payment approved' : 'Payment rejected',
        `${item.name || 'Customer'} · ${formatInr(item.amount)}`
      );
      setRejectKey(null);
      setRejectReason('');
      setPreviewKey(null);
      window.dispatchEvent(new Event(PAYMENT_APPROVALS_REFRESH_EVENT));
    } catch (err) {
      hideItem(key, false);
      setError(errorMessage(err, action === 'approve' ? 'Approve failed' : 'Reject failed'));
    } finally {
      setBusyKey(null);
    }
  };

  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={total ? `${total} payment${total === 1 ? '' : 's'} to approve` : 'Payments to approve'}
          aria-label={`Payments to approve: ${total}`}
          className={cn(
            'relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
            total > 0
              ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          )}
        >
          <Bell className="h-4.5 w-4.5" />
          {total > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-4.5 text-center tabular-nums shadow-sm">
              {total > 9 ? '9+' : total}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[400px] max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Payments to approve ({total})</p>
            <p className="text-[11px] text-slate-500">Collections and customer payment proofs</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-500"
            onClick={() => load(true)}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-2.5 py-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                filter === f.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {f.label} <span className="tabular-nums opacity-80">{filterCount[f.id]}</span>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mx-3 mt-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && !summary.items?.length ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-10 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-800">All caught up</p>
              <p className="text-[11px] text-slate-500">Nothing to approve right now.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleItems.map((item) => {
                const key = itemKey(item);
                const busy = busyKey === key;
                const isPunch = item.kind === 'punch';
                const sourceLabel = isPunch
                  ? `Collection · ${TYPE_LABELS[item.type] || item.type || 'Payment'}`
                  : `Customer proof${item.emiNumber != null ? ` · EMI ${item.emiNumber}` : ''}`;
                return (
                  <li key={key} className="px-3.5 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">{item.name || 'Customer'}</p>
                        <p className="truncate font-mono text-[11px] text-blue-700">{item.loanNo || '—'}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-bold tabular-nums text-emerald-700">
                        {formatInr(item.amount)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold',
                          isPunch ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-violet-200 bg-violet-50 text-violet-700'
                        )}
                      >
                        {isPunch ? <Wallet className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                        {sourceLabel}
                      </span>
                      {item.mode ? <span className="text-slate-500">{item.mode}</span> : null}
                      {item.ref ? <span className="truncate font-mono text-slate-500">UTR {item.ref}</span> : null}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {item.by ? `By ${item.by}` : ''}{item.by && item.at ? ' · ' : ''}{timeAgo(item.at)}
                    </p>

                    {previewKey === key && item.proofUrl && isImageUrl(item.proofUrl) ? (
                      <a href={item.proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={item.proofUrl}
                          alt="Payment proof"
                          className="max-h-48 w-full rounded-md border border-slate-200 bg-slate-50 object-contain"
                        />
                      </a>
                    ) : null}

                    {rejectKey === key ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          autoFocus
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && rejectReason.trim()) runAction(item, 'reject');
                          }}
                          placeholder="Reason for rejecting (required)"
                          className="h-8 text-[12px]"
                          disabled={busy}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 bg-rose-600 px-2.5 text-[11px] text-white hover:bg-rose-700"
                          disabled={busy || !rejectReason.trim()}
                          onClick={() => runAction(item, 'reject')}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reject'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-[11px] text-slate-500"
                          disabled={busy}
                          onClick={() => {
                            setRejectKey(null);
                            setRejectReason('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 flex-1 bg-emerald-600 text-[12px] font-semibold text-white hover:bg-emerald-700"
                          disabled={busy || Boolean(busyKey)}
                          onClick={() => runAction(item, 'approve')}
                        >
                          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 flex-1 border-rose-200 text-[12px] font-semibold text-rose-700 hover:bg-rose-50"
                          disabled={busy || Boolean(busyKey)}
                          onClick={() => {
                            setRejectKey(key);
                            setRejectReason('');
                          }}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                        {item.proofUrl ? (
                          isImageUrl(item.proofUrl) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-[11px]"
                              onClick={() => setPreviewKey(previewKey === key ? null : key)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              {previewKey === key ? 'Hide' : 'Proof'}
                            </Button>
                          ) : (
                            <a
                              href={item.proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Proof
                            </a>
                          )
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3.5 py-2">
          <button
            type="button"
            onClick={() => goTo('/admin/collection?tab=approval')}
            className="text-[11px] font-semibold text-blue-700 hover:underline"
          >
            Open full approval screen
          </button>
          <button
            type="button"
            onClick={() => goTo('/admin/repayments')}
            className="text-[11px] font-semibold text-slate-600 hover:underline"
          >
            Customer proofs
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
