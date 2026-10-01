import { useCallback, useEffect, useState } from 'react';
import { collectionAPI } from '@/lib/api/collection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, ExternalLink, Eye } from 'lucide-react';
import { formatInr } from '@/components/admin/collections/shared/collectionUi';
import CollectionDataTable from '@/components/admin/collections/shared/CollectionDataTable';
import { PAYMENT_APPROVALS_REFRESH_EVENT } from '@/components/admin/header/PaymentApprovalsBell';

const TYPE_LABELS = {
  full_payment: 'Full payment',
  part_payment: 'Part payment',
  prepayment: 'Prepayment / Close account',
  settlement: 'Settlement',
};

export default function CollectionApprovalPanel() {
  const [loading, setLoading] = useState(true);
  const [punches, setPunches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewPunch, setReviewPunch] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await collectionAPI.getPendingCollectionPunches({ page, limit: 20, search });
      if (res.status === 1) {
        setPunches(res.data?.punches || []);
        setPagination(res.data?.pagination || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleApprove = async (punch) => {
    setBusyId(punch.id);
    try {
      await collectionAPI.approveCollectionPunch(punch.id, {});
      window.dispatchEvent(new Event(PAYMENT_APPROVALS_REFRESH_EVENT));
      setReviewPunch(null);
      await load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setBusyId(rejectId);
    try {
      await collectionAPI.rejectCollectionPunch(rejectId, { reason: rejectReason.trim() });
      window.dispatchEvent(new Event(PAYMENT_APPROVALS_REFRESH_EVENT));
      setRejectId(null);
      setRejectReason('');
      setReviewPunch(null);
      await load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between border border-slate-200 bg-white px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Collection approval</h3>
          <p className="text-xs text-slate-500">Review proof beside amount before ledger posting</p>
        </div>
        <Input
          className="max-w-xs h-8 text-xs rounded-none"
          placeholder="Search application / ref"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
        />
      </div>

      {error && <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <CollectionDataTable
            loading={loading && punches.length === 0}
            emptyTitle={!loading && punches.length === 0 ? 'No collections pending approval' : undefined}
            pagination={
              pagination.totalPages > 1
                ? { page: pagination.page, totalPages: pagination.totalPages }
                : null
            }
            onPageChange={(page) => load(page)}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Application</TableHead>
                  <TableHead className="text-xs">Borrower</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Collected</TableHead>
                  <TableHead className="text-xs">Mode</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punches.map((p) => (
                  <TableRow
                    key={p.id}
                    className={reviewPunch?.id === p.id ? 'bg-blue-50/60' : undefined}
                  >
                    <TableCell className="font-mono text-xs">
                      {p.loan_account_number || p.lead_id || p.loan_application_id}
                    </TableCell>
                    <TableCell className="text-sm">{p.borrower_name || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {TYPE_LABELS[p.collection_type] || p.collection_type || 'Full payment'}
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {formatInr(p.collected_amount || p.reference_amount)}
                    </TableCell>
                    <TableCell className="text-xs">{p.payment_mode || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setReviewPunch(p)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollectionDataTable>
        </div>

        <div className="xl:col-span-2 border border-slate-200 bg-white p-4 space-y-3 min-h-[280px]">
          {!reviewPunch ? (
            <p className="text-xs text-slate-500 py-12 text-center">
              Select a punch to preview proof and confirm amounts.
            </p>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  {reviewPunch.borrower_name || 'Borrower'}
                </h4>
                <p className="text-xs font-mono text-blue-700 mt-0.5">
                  {reviewPunch.loan_account_number || reviewPunch.lead_id || reviewPunch.loan_application_id}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-slate-100 px-2 py-2">
                  <p className="text-[10px] uppercase text-slate-400">Collected</p>
                  <p className="font-semibold tabular-nums text-emerald-700">
                    {formatInr(reviewPunch.collected_amount || reviewPunch.reference_amount)}
                  </p>
                </div>
                <div className="border border-slate-100 px-2 py-2">
                  <p className="text-[10px] uppercase text-slate-400">Reference / EMI</p>
                  <p className="font-semibold tabular-nums">
                    {formatInr(reviewPunch.reference_amount || reviewPunch.emi_amount || 0)}
                  </p>
                </div>
                <div className="border border-slate-100 px-2 py-2">
                  <p className="text-[10px] uppercase text-slate-400">Type</p>
                  <p className="font-medium">
                    {TYPE_LABELS[reviewPunch.collection_type] || reviewPunch.collection_type}
                  </p>
                </div>
                <div className="border border-slate-100 px-2 py-2">
                  <p className="text-[10px] uppercase text-slate-400">Mode / Date</p>
                  <p className="font-medium">
                    {reviewPunch.payment_mode || '—'} · {reviewPunch.collection_date || '—'}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Ref: <span className="font-mono">{reviewPunch.reference_no || '—'}</span>
                {' · '}By {reviewPunch.requested_by_name || '—'}
              </p>
              <div className="border border-slate-100 bg-slate-50 min-h-[160px] flex items-center justify-center overflow-hidden">
                {reviewPunch.proof_url ? (
                  /\.(png|jpe?g|gif|webp)$/i.test(reviewPunch.proof_url) ? (
                    <img
                      src={reviewPunch.proof_url}
                      alt="Payment proof"
                      className="max-h-56 w-full object-contain"
                    />
                  ) : (
                    <a
                      href={reviewPunch.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                    >
                      Open proof
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )
                ) : (
                  <span className="text-xs text-slate-400">No proof uploaded</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700"
                  disabled={busyId === reviewPunch.id}
                  onClick={() => handleApprove(reviewPunch)}
                >
                  {busyId === reviewPunch.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={busyId === reviewPunch.id}
                  onClick={() => {
                    setRejectId(reviewPunch.id);
                    setRejectReason('');
                  }}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {rejectId && (
        <div className="border border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
          <p className="text-sm font-medium text-slate-700">Rejection reason</p>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason"
            className="h-9 text-sm rounded-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={busyId === rejectId}>
              Confirm reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
