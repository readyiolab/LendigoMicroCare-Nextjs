import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@/lib/router';
import { collectionAPI } from '@/lib/api/collection';
import CollectionLoanPicker from '@/components/admin/collections/CollectionLoanPicker';
import { HandCoins, Plus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CollectionKpiGrid from '@/components/admin/collections/shared/CollectionKpiGrid';
import CollectionSegmentedControl from '@/components/admin/collections/shared/CollectionSegmentedControl';
import CollectionDataTable from '@/components/admin/collections/shared/CollectionDataTable';
import { PtpStatusBadge } from '@/components/admin/collections/shared/CollectionStatusBadge';
import { formatInr } from '@/components/admin/collections/shared/collectionUi';

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'kept', label: 'Kept' },
  { value: 'broken', label: 'Broken' },
];

/** API dates arrive as 'YYYY-MM-DD' or UTC-midnight ISO; the first 10 chars are the calendar day */
function toYmd(value) {
  return value ? String(value).slice(0, 10) : '';
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatYmd(ymd) {
  return ymd ? ymd.split('-').reverse().join('/') : '—';
}

export default function PTPTracker({ dueToday = false }) {
  const navigate = useNavigate();
  const [ptps, setPtps] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [myQueue, setMyQueue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const [actionModal, setActionModal] = useState({ show: false, ptpId: null, status: '', remarks: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form, setForm] = useState({
    loanApplicationId: '',
    userId: '',
    promiseDate: '',
    promiseAmount: '',
    remarks: '',
  });

  const fetchPTPs = useCallback(async (cacheBust = false) => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      if (myQueue) params.myQueue = 'true';
      if (dueToday) params.dueToday = 'true';
      params.rollup = showHistory ? 'none' : 'latest_pending_per_loan';
      if (cacheBust) params._t = Date.now();
      const res = await collectionAPI.getPTPs(params);
      if (res?.status === 1) {
        setPtps(res.data || []);
        setSummary(res.summary || null);
      }
    } catch (err) {
      console.error('Fetch PTPs error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, myQueue, dueToday, showHistory]);

  useEffect(() => {
    fetchPTPs();
  }, [fetchPTPs]);

  const handleLoanSelected = (details) => {
    setSelectedLoan(details);
    setForm((f) => ({
      ...f,
      loanApplicationId: details.loanApplicationId,
      userId: details.userId,
      promiseAmount: String(details.totalOutstanding ?? ''),
    }));
  };

  const handleLoanClear = () => {
    setSelectedLoan(null);
    setForm((f) => ({
      ...f,
      loanApplicationId: '',
      userId: '',
      promiseAmount: '',
    }));
  };

  const handleCreate = async () => {
    if (!form.loanApplicationId || !form.promiseDate || !form.promiseAmount) return;
    setSubmitting(true);
    try {
      const res = await collectionAPI.recordPTP({
        ...form,
        promiseAmount: parseFloat(form.promiseAmount),
      });
      if (res?.status !== 1) {
        throw new Error(res?.message || 'Failed to record PTP');
      }
      setShowModal(false);
      resetForm();
      setSuccessMsg('Promise to Pay recorded — it will appear as Pending until the promise date or payment.');
      setTimeout(() => setSuccessMsg(''), 6000);
      fetchPTPs(true);
    } catch (err) {
      console.error('Create PTP error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!actionModal.ptpId || !actionModal.status) return;
    const ptpId = actionModal.ptpId;
    const newStatus = actionModal.status;
    const remarkText = actionModal.remarks;
    setUpdatingStatus(true);
    setActionError('');
    try {
      const res = await collectionAPI.updatePTPStatus(ptpId, {
        status: newStatus,
        remarks: remarkText,
      });
      if (res?.status === 1) {
        setActionModal({ show: false, ptpId: null, status: '', remarks: '' });
        setPtps((prev) =>
          prev.map((p) => (p.id === ptpId ? { ...p, ptp_status: newStatus } : p))
        );
        fetchPTPs(true);
        if (newStatus === 'broken') {
          setSuccessMsg(
            'PTP marked as Broken. Escalate the loan in Overdue Loans: call the borrower, add a remark, or record a new PTP / settlement.'
          );
          setTimeout(() => setSuccessMsg(''), 12000);
        } else if (newStatus === 'kept') {
          setSuccessMsg('PTP marked as Kept — promise fulfilled.');
          setTimeout(() => setSuccessMsg(''), 6000);
        } else {
          setSuccessMsg('PTP status updated.');
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      } else {
        setActionError(res?.message || 'Failed to update PTP status');
      }
    } catch (err) {
      setActionError(err.message || 'Failed to update PTP status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const resetForm = () => {
    setForm({ loanApplicationId: '', userId: '', promiseDate: '', promiseAmount: '', remarks: '' });
    setSelectedLoan(null);
  };

  const stats = summary || {
    total: ptps.length,
    pending: ptps.filter((p) => p.ptp_status === 'pending').length,
    kept: ptps.filter((p) => p.ptp_status === 'kept').length,
    broken: ptps.filter((p) => p.ptp_status === 'broken').length,
  };
  const today = todayYmd();

  const kpis = [
    { label: 'Total', value: stats.total },
    { label: 'Pending', value: stats.pending, tone: 'warning' },
    { label: 'Kept', value: stats.kept, tone: 'success' },
    { label: 'Broken', value: stats.broken, tone: 'danger' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 border border-slate-200 bg-slate-50 px-3 py-2">
        <strong>Pending:</strong> promise date not reached or payment not verified.
        {' '}<strong>Kept:</strong> customer paid as promised.
        {' '}<strong>Broken:</strong> promise date passed with no payment — escalate in Overdue Loans.
        {' '}Pending promises are auto-closed the day after the promise date (Kept if payment is verified, otherwise Broken).
        {' '}<strong>Past promise</strong> = the customer missed their promised date; the EMI itself may still be pre-due (see Next EMI due).
      </p>

      {successMsg && (
        <Alert className="rounded-md border-emerald-200 bg-emerald-50 py-2">
          <AlertDescription className="text-xs text-emerald-800 flex flex-wrap items-center gap-2">
            <span>{successMsg}</span>
            {successMsg.includes('Broken') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => navigate('/admin/collection?tab=overdue')}
              >
                Open Overdue Loans
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="rounded-none py-2">
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CollectionKpiGrid items={kpis} className="grid-cols-2 sm:grid-cols-4 flex-1" />
        <Button
          type="button"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="h-9 gap-1.5 text-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Record PTP
        </Button>
      </div>

      <CollectionSegmentedControl
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={myQueue ? 'default' : 'outline'}
          className="h-8 text-xs"
          onClick={() => setMyQueue((v) => !v)}
        >
          My queue
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showHistory ? 'default' : 'outline'}
          className="h-8 text-xs"
          title="Show every pending promise, not only the latest one per loan"
          onClick={() => setShowHistory((v) => !v)}
        >
          All promises per loan
        </Button>
        {dueToday && (
          <span className="inline-flex items-center h-8 px-2 text-[10px] uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-100">
            Due today filter on
          </span>
        )}
      </div>

      <CollectionDataTable
        loading={loading}
        emptyIcon={HandCoins}
        emptyTitle={!loading && ptps.length === 0 ? 'No promise-to-pay records' : undefined}
        emptyDescription={!loading && ptps.length === 0 ? 'Record a PTP when a borrower commits to pay by a specific date.' : undefined}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Loan #</TableHead>
              <TableHead className="text-xs">Borrower</TableHead>
              <TableHead className="text-xs">Promise date</TableHead>
              <TableHead className="text-xs">Next EMI due</TableHead>
              <TableHead className="text-xs">Amount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Recorded by</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ptps.map((p, i) => {
              const promiseYmd = toYmd(p.promise_date);
              const isPending = p.ptp_status === 'pending';
              const isPastPromise = isPending && promiseYmd < today;
              const isDueToday = isPending && promiseYmd === today;
              return (
                <TableRow key={p.id || i}>
                  <TableCell className="text-xs font-medium text-blue-700">
                    #{p.loan_application_id}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-slate-900">{p.borrower_name || '—'}</p>
                    <p className="text-xs text-slate-500">ID {p.user_id}</p>
                  </TableCell>
                  <TableCell>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-xs',
                        isPastPromise ? 'text-red-600' : 'text-slate-700'
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {formatYmd(promiseYmd)}
                      {isPastPromise && (
                        <span className="text-[10px] bg-red-50 text-red-700 border border-red-100 px-1">
                          Past promise
                        </span>
                      )}
                      {isDueToday && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-100 px-1">
                          Due today
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 tabular-nums">
                    {formatYmd(toYmd(p.next_emi_due_date))}
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    {formatInr(p.promise_amount)}
                  </TableCell>
                  <TableCell>
                    <PtpStatusBadge status={p.ptp_status} />
                    {p.remarks && (
                      <p className="text-xs text-slate-500 mt-1 max-w-[160px] truncate" title={p.remarks}>
                        {p.remarks}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {p.ptp_status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2"
                          onClick={() => {
                            setActionError('');
                            setActionModal({ show: true, ptpId: p.id, status: 'kept', remarks: '' });
                          }}
                        >
                          Kept
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2 text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setActionError('');
                            setActionModal({ show: true, ptpId: p.id, status: 'broken', remarks: '' });
                          }}
                        >
                          Broken
                        </Button>
                      </div>
                    )}
                    {p.ptp_status === 'broken' && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-7 text-xs text-red-600 px-0"
                        onClick={() =>
                          navigate(`/admin/collection?tab=overdue&loanId=${p.loan_application_id}`)
                        }
                      >
                        Escalate in Overdue
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CollectionDataTable>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg rounded-md border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Record Promise to Pay</DialogTitle>
            <DialogDescription className="text-xs">
              Track when a borrower promises to settle their dues.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <CollectionLoanPicker
              accent="amber"
              selectedLoan={selectedLoan}
              onLoanSelected={handleLoanSelected}
              onClear={handleLoanClear}
            />

            {selectedLoan && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Promise date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      min={today}
                      value={form.promiseDate}
                      onChange={(e) => setForm((f) => ({ ...f, promiseDate: e.target.value }))}
                      className="h-9 text-sm rounded-none"
                    />
                    {selectedLoan.nextEmiDueDate && (
                      <p className="text-[11px] text-slate-500">
                        Next EMI: {formatYmd(selectedLoan.nextEmiDueDate)}
                        {selectedLoan.nextEmiDueDate >= today && form.promiseDate !== selectedLoan.nextEmiDueDate && (
                          <button
                            type="button"
                            className="ml-1 text-blue-700 hover:underline"
                            onClick={() => setForm((f) => ({ ...f, promiseDate: selectedLoan.nextEmiDueDate }))}
                          >
                            Use for &quot;pay on due date&quot;
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Amount (₹) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.promiseAmount}
                      onChange={(e) => setForm((f) => ({ ...f, promiseAmount: e.target.value }))}
                      className="h-9 text-sm font-medium tabular-nums rounded-none"
                      placeholder="Amount"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Remarks</Label>
                  <Textarea
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    rows={3}
                    className="text-sm resize-none rounded-none"
                    placeholder="e.g. Promised to pay by UPI after salary…"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !form.loanApplicationId || !form.promiseDate || !form.promiseAmount}
              onClick={handleCreate}
              className="gap-1.5"
            >
              <HandCoins className="w-4 h-4" />
              {submitting ? 'Recording…' : 'Record PTP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionModal.show}
        onOpenChange={(open) => {
          if (!open) setActionModal({ show: false, ptpId: null, status: '', remarks: '' });
        }}
      >
        <DialogContent className="sm:max-w-sm rounded-md border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Mark as {actionModal.status === 'kept' ? 'Kept' : 'Broken'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add closing remarks for this promise-to-pay record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Closing remarks</Label>
            <Textarea
              value={actionModal.remarks}
              onChange={(e) => setActionModal((prev) => ({ ...prev, remarks: e.target.value }))}
              rows={3}
              className="text-sm resize-none rounded-none"
              placeholder={
                actionModal.status === 'kept'
                  ? 'e.g. Paid via UPI…'
                  : 'e.g. Number unreachable…'
              }
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActionModal({ show: false, ptpId: null, status: '', remarks: '' })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updatingStatus}
              onClick={handleUpdateStatus}
              className={cn(
                actionModal.status === 'kept'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {updatingStatus ? 'Updating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
