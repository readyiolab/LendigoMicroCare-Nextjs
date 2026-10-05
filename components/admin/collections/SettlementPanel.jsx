import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collectionAPI } from '@/lib/api/collection';
import CollectionLoanPicker from '@/components/admin/collections/CollectionLoanPicker';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  isSettlementChecker,
  isSettlementMaker,
  canApproveSettlement,
} from '@/utils/settlementPermissions';
import { Scale, Plus, CheckCircle2, XCircle, ArrowRight, AlertCircle, TrendingUp } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SettlementStatusBadge } from '@/components/admin/collections/shared/CollectionStatusBadge';
import { formatInr } from '@/components/admin/collections/shared/collectionUi';

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending_approval', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'settlement_paid', label: 'Completed' },
];

export default function SettlementPanel() {
  const { admin } = useAdminAuth();
  const isMaker = useMemo(() => isSettlementMaker(admin), [admin]);
  const isChecker = useMemo(() => isSettlementChecker(admin), [admin]);

  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [filter, setFilter] = useState('');
  const [banner, setBanner] = useState({ type: '', message: '' });

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form, setForm] = useState({
    loanApplicationId: '',
    userId: '',
    originalDue: '',
    proposedAmount: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'UPI' });

  const showError = (err, fallback) => {
    const msg = err?.message || err?.response?.data?.message || fallback;
    setBanner({ type: 'error', message: msg });
  };

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await collectionAPI.getSettlements(params);
      if (res?.status === 1) setSettlements(res.data || []);
    } catch (err) {
      console.error('Fetch settlements error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const handleLoanSelected = (details) => {
    setSelectedLoan(details);
    setForm((f) => ({
      ...f,
      loanApplicationId: details.loanApplicationId,
      userId: details.userId,
      originalDue: String(details.totalOutstanding ?? ''),
      proposedAmount: '',
      reason: '',
    }));
  };

  const handleLoanClear = () => {
    setSelectedLoan(null);
    setForm((f) => ({
      ...f,
      loanApplicationId: '',
      userId: '',
      originalDue: '',
      proposedAmount: '',
    }));
  };

  const handleCreate = async () => {
    if (!isMaker) {
      setBanner({ type: 'error', message: 'Your role cannot request settlements.' });
      return;
    }
    if (!form.loanApplicationId || !form.originalDue || !form.proposedAmount || !form.reason) return;
    setSubmitting(true);
    setBanner({ type: '', message: '' });
    try {
      const res = await collectionAPI.requestSettlement({
        ...form,
        originalDue: parseFloat(form.originalDue),
        proposedAmount: parseFloat(form.proposedAmount),
      });
      if (res?.status === 1) {
        setBanner({ type: 'success', message: 'Settlement request submitted for approval.' });
        setShowModal(false);
        resetForm();
        fetchSettlements();
      } else {
        showError(null, res?.message || 'Failed to submit settlement');
      }
    } catch (err) {
      console.error('Create settlement error:', err);
      showError(err, 'Failed to submit settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ loanApplicationId: '', userId: '', originalDue: '', proposedAmount: '', reason: '' });
    setSelectedLoan(null);
  };

  const handleAction = async (action) => {
    if (!actionModal) return;
    if (!canApproveSettlement(admin, actionModal)) {
      setBanner({
        type: 'error',
        message: isChecker
          ? 'You cannot approve or reject your own request (maker-checker).'
          : 'Only Operations Manager or Super Admin can approve or reject.',
      });
      return;
    }
    setSubmitting(true);
    setBanner({ type: '', message: '' });
    try {
      const res = await collectionAPI.actionSettlement(actionModal.id, { action, remarks: actionRemarks });
      if (res?.status === 1) {
        setBanner({
          type: 'success',
          message:
            action === 'approved'
              ? 'Settlement approved. Record payment when received.'
              : 'Settlement rejected.',
        });
        setActionModal(null);
        setActionRemarks('');
        fetchSettlements();
      } else {
        showError(null, res?.message || 'Action failed');
      }
    } catch (err) {
      console.error('Settlement action error:', err);
      showError(err, 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModal || !paymentForm.amount || !paymentForm.mode) return;
    if (!isMaker) {
      setBanner({ type: 'error', message: 'Your role cannot record settlement payments.' });
      return;
    }
    setSubmitting(true);
    setBanner({ type: '', message: '' });
    try {
      const res = await collectionAPI.recordSettlementPayment(paymentModal.id, {
        amountPaid: parseFloat(paymentForm.amount),
        paymentMode: paymentForm.mode,
      });
      if (res?.status === 1) {
        setBanner({ type: 'success', message: 'Payment recorded. Loan closed and ledger updated.' });
        setPaymentModal(null);
        setPaymentForm({ amount: '', mode: 'UPI' });
        fetchSettlements();
      } else {
        showError(null, res?.message || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Record payment error:', err);
      showError(err, 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const getDiscount = (original, proposed) => {
    if (!original || !proposed) return 0;
    const pct = ((original - proposed) / original) * 100;
    return pct > 0 && pct < 1 ? 1 : Math.round(pct);
  };

  const kpis = [
    { label: 'Total', value: settlements.length },
    {
      label: 'Pending approval',
      value: settlements.filter((s) => s.status === 'pending_approval').length,
      tone: 'warning',
    },
    {
      label: 'Approved',
      value: settlements.filter((s) => s.status === 'approved').length,
      tone: 'success',
    },
    {
      label: 'Completed',
      value: settlements.filter((s) => s.status === 'settlement_paid' || s.status === 'completed').length,
      tone: 'info',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <p>
          <strong>Maker</strong> requests settlement · <strong>Checker</strong> approves/rejects (not own request) ·
          Maker records payment after approval.
        </p>
        <span className="text-slate-500">
          Role: {admin?.role_code || admin?.role || '—'}
          {isChecker ? ' · checker' : ''}
          {isMaker ? ' · maker' : ''}
        </span>
      </div>

      {banner.message && (
        <Alert
          variant={banner.type === 'error' ? 'destructive' : 'default'}
          className={cn(
            'rounded-md py-2',
            banner.type === 'success' && 'border-emerald-200 bg-emerald-50'
          )}
        >
          <AlertDescription className="text-xs">{banner.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <CollectionKpiGrid items={kpis} className="grid-cols-2 sm:grid-cols-4 flex-1" />
        {isMaker && (
          <Button
            type="button"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="h-9 gap-1.5 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Request Settlement
          </Button>
        )}
      </div>

      <CollectionSegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

      <CollectionDataTable
        loading={loading}
        emptyIcon={Scale}
        emptyTitle={!loading && settlements.length === 0 ? 'No settlement requests' : undefined}
        emptyDescription={
          !loading && settlements.length === 0
            ? isMaker
              ? 'Request a settlement to negotiate a discounted closure on a defaulted loan.'
              : 'No settlement requests match the current filter.'
            : undefined
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Loan</TableHead>
              <TableHead className="text-xs">Original due</TableHead>
              <TableHead className="text-xs">Proposed</TableHead>
              <TableHead className="text-xs">Discount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Requested by</TableHead>
              <TableHead className="text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((s, i) => {
              const discount = getDiscount(s.original_due_amount, s.proposed_settlement_amount);
              return (
                <TableRow key={s.id || i}>
                  <TableCell>
                    <p className="text-xs font-medium text-blue-700">#{s.loan_application_id}</p>
                    {s.application_number && (
                      <p className="text-[10px] text-slate-500">{s.application_number}</p>
                    )}
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{s.borrower_name || '—'}</p>
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">
                    {formatInr(s.original_due_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm font-medium tabular-nums text-emerald-700">
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      {formatInr(s.proposed_settlement_amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'text-xs font-medium px-1.5 py-0.5 border',
                        discount > 30
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : discount > 15
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      )}
                    >
                      {discount}% off
                    </span>
                  </TableCell>
                  <TableCell>
                    <SettlementStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {s.requested_by_name || `Admin #${s.requested_by_admin}`}
                  </TableCell>
                  <TableCell>
                    {s.status === 'pending_approval' && canApproveSettlement(admin, s) && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-emerald-600"
                          title="Approve"
                          onClick={() => setActionModal({ ...s, targetAction: 'approved' })}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500"
                          title="Reject"
                          onClick={() => setActionModal({ ...s, targetAction: 'rejected' })}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {s.status === 'pending_approval' && !canApproveSettlement(admin, s) && (
                      <span className="text-[10px] text-slate-400">
                        {Number(s.requested_by_admin) === Number(admin?.id)
                          ? 'Awaiting checker'
                          : isChecker
                            ? '—'
                            : 'Checker only'}
                      </span>
                    )}
                    {s.status === 'approved' && isMaker && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px]"
                        onClick={() => {
                          setPaymentModal(s);
                          setPaymentForm({
                            amount: s.proposed_settlement_amount.toString(),
                            mode: 'UPI',
                          });
                        }}
                      >
                        Record payment
                      </Button>
                    )}
                    {(s.status === 'settlement_paid' || s.status === 'completed') && (
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Loan closed
                      </span>
                    )}
                    {s.status === 'rejected' && (
                      <span className="text-[10px] text-slate-400">No action</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CollectionDataTable>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-xl rounded-md border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Request Settlement</DialogTitle>
            <DialogDescription className="text-xs">
              Negotiate a discount to close a defaulted loan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <CollectionLoanPicker
              accent="indigo"
              selectedLoan={selectedLoan}
              onLoanSelected={handleLoanSelected}
              onClear={handleLoanClear}
            />

            {selectedLoan && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Original due (₹)</Label>
                    <Input
                      readOnly
                      value={form.originalDue ? Number(form.originalDue).toLocaleString('en-IN') : ''}
                      className="h-9 text-sm font-medium tabular-nums bg-slate-50 rounded-md"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Proposed amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.proposedAmount}
                      onChange={(e) => setForm((f) => ({ ...f, proposedAmount: e.target.value }))}
                      className="h-9 text-sm font-medium tabular-nums rounded-none"
                      placeholder="Amount"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    rows={3}
                    className="text-sm resize-none rounded-none"
                    placeholder="e.g. Medical emergency, job loss…"
                  />
                </div>
                {form.originalDue && form.proposedAmount && (
                  <div
                    className={cn(
                      'px-3 py-2 flex items-center gap-2 text-xs border',
                      getDiscount(parseFloat(form.originalDue), parseFloat(form.proposedAmount)) > 30
                        ? 'bg-red-50 text-red-800 border-red-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    )}
                  >
                    {getDiscount(parseFloat(form.originalDue), parseFloat(form.proposedAmount)) > 30 ? (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {getDiscount(parseFloat(form.originalDue), parseFloat(form.proposedAmount))}% waiver on
                      total dues
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !form.loanApplicationId || !form.proposedAmount || !form.reason}
              onClick={handleCreate}
              className="gap-1.5"
            >
              <Scale className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Request settlement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentModal} onOpenChange={(open) => !open && setPaymentModal(null)}>
        <DialogContent className="sm:max-w-sm rounded-md border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Record Settlement Payment</DialogTitle>
            <DialogDescription className="text-xs">
              Finalize payment and close loan #{paymentModal?.loan_application_id}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Payment amount (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                className="h-9 text-sm font-medium tabular-nums rounded-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Payment mode <span className="text-red-500">*</span>
              </Label>
              <Select
                value={paymentForm.mode}
                onValueChange={(val) => setPaymentForm((f) => ({ ...f, mode: val }))}
              >
                <SelectTrigger className="h-9 text-sm rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentModal && (
              <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Recording this payment will close the loan and waive the remaining balance of{' '}
                {formatInr(paymentModal.original_due_amount - paymentForm.amount)}. This cannot be undone.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPaymentModal(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !paymentForm.amount}
              onClick={handleRecordPayment}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? 'Processing…' : 'Confirm & close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionModal} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent className="sm:max-w-sm rounded-md border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              {actionModal?.targetAction === 'approved' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Approve settlement
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500" />
                  Reject settlement
                </>
              )}
            </DialogTitle>
            {actionModal && (
              <DialogDescription className="text-xs">
                Loan #{actionModal.loan_application_id} — Original{' '}
                {formatInr(actionModal.original_due_amount)} → Settlement{' '}
                {formatInr(actionModal.proposed_settlement_amount)}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs">Approval / rejection note</Label>
            <Textarea
              value={actionRemarks}
              onChange={(e) => setActionRemarks(e.target.value)}
              rows={2}
              className="text-sm resize-none rounded-none"
              placeholder="Add a note for the agent…"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => handleAction(actionModal.targetAction)}
              className={cn(
                actionModal?.targetAction === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {submitting ? 'Processing…' : actionModal?.targetAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
