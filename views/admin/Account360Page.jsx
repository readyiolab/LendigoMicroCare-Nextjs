import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from '@/lib/router';
import { account360API } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { customerHistoryPath, shortLoanLabel } from '@/utils/customerIdentity';
import { applicationDetailPath } from '@/utils/applicationRef';
import { formatStatusLabel } from '@/utils/statusUtils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  isSettlementChecker,
  isSettlementMaker,
  canApproveSettlement,
} from '@/utils/settlementPermissions';
import {
  ChevronLeft,
  FileText,
  Clock,
  Scale,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HandCoins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CollectionPunchModal from '@/components/admin/collections/CollectionPunchModal';
import CreatePtpForm from '@/components/admin/collections/shared/CreatePtpForm';
import InitiateSettlementForm from '@/components/admin/collections/shared/InitiateSettlementForm';
import AddCollectionRemarkForm from '@/components/admin/collections/shared/AddCollectionRemarkForm';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ptp', label: 'PTP' },
  { id: 'payments', label: 'Payments' },
  { id: 'settlement', label: 'Settlement' },
  { id: 'collection', label: 'Collection' },
  { id: 'noc', label: 'NOC' },
];

const inr = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

function formatDay(value) {
  if (!value) return '';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fineStepText(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  return steps
    .map((step) => `${step.days} day${Number(step.days) === 1 ? '' : 's'} on ${inr(step.balance)}`)
    .join(', then ');
}

function FlatFineBreakdown({ fine }) {
  if (!fine || Number(fine.contractDue) <= 0) return null;
  const paidOn = formatDay(fine.partPaidOn);
  const steps = fineStepText(fine.steps);
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
      <p>Contract due <span className="font-semibold tabular-nums">{inr(fine.contractDue)}</span></p>
      <p>
        Part paid <span className="font-semibold tabular-nums text-emerald-700">{inr(fine.partPaid)}</span>
        {paidOn ? ` on ${paidOn}` : ''}
      </p>
      <p>Unpaid before fine <span className="font-semibold tabular-nums">{inr(fine.unpaidBeforeFine)}</span></p>
      <p>
        Late charge <span className="font-semibold tabular-nums text-red-600">{inr(fine.lateCharge)}</span>
        {' · '}
        {fine.fineNote || '2% per day on the unpaid balance'}
      </p>
      {steps && <p className="text-slate-500">{steps}</p>}
      <p>Payable today <span className="font-bold tabular-nums text-slate-900">{inr(fine.payable)}</span></p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export default function Account360Page() {
  const { accountRef } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [banner, setBanner] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const [showCollectionPunch, setShowCollectionPunch] = useState(false);
  const [showPtp, setShowPtp] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showRemark, setShowRemark] = useState(false);
  const [settlementAction, setSettlementAction] = useState(null);
  const [settlementPayment, setSettlementPayment] = useState(null);

  const [ptpForm, setPtpForm] = useState({ promiseDate: '', promiseAmount: '', remarks: '' });
  const [settlementForm, setSettlementForm] = useState({ proposedAmount: '', reason: '' });
  const [actionRemarks, setActionRemarks] = useState('');
  const [remarkForm, setRemarkForm] = useState({ remarkType: 'general', remark: '', nextFollowUpDate: '' });
  const [paymentForm, setPaymentForm] = useState({ amountPaid: '', paymentMode: 'cash' });

  const isMaker = useMemo(() => isSettlementMaker(admin), [admin]);
  const isChecker = useMemo(() => isSettlementChecker(admin), [admin]);

  const load = useCallback(async () => {
    if (!accountRef) return;
    setLoading(true);
    setError('');
    try {
      const res = await account360API.getAccount360(accountRef);
      if (res.status === 1) {
        setData(res.data);
        if (res.data?.account?.isLeadOnly) {
          setError('This lead does not have a loan account number yet. Open the application workflow instead.');
        }
      } else {
        setError(res.message || 'Account not found');
        setData(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load account');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accountRef]);

  useEffect(() => {
    load();
  }, [load]);

  const account = data?.account;
  const customer = data?.customer;
  const financials = data?.financials;
  const actions = data?.actions || {};

  const handlePtp = async () => {
    setSubmitting(true);
    try {
      const res = await account360API.createPtp(accountRef, ptpForm);
      if (res.status === 1) {
        setBanner({ type: 'success', message: 'PTP recorded' });
        setShowPtp(false);
        setPtpForm({ promiseDate: '', promiseAmount: '', remarks: '' });
        await load();
      }
    } catch (err) {
      setBanner({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementRequest = async () => {
    setSubmitting(true);
    try {
      const res = await account360API.requestSettlement(accountRef, settlementForm);
      if (res.status === 1) {
        setBanner({ type: 'success', message: 'Settlement request submitted' });
        setShowSettlement(false);
        setSettlementForm({ proposedAmount: '', reason: '' });
        await load();
      }
    } catch (err) {
      setBanner({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementAction = async (action) => {
    if (!settlementAction) return;
    setSubmitting(true);
    try {
      const res = await account360API.actionSettlement(accountRef, settlementAction.id, {
        action,
        remarks: actionRemarks,
      });
      if (res.status === 1) {
        setBanner({ type: 'success', message: `Settlement ${action}` });
        setSettlementAction(null);
        setActionRemarks('');
        await load();
      }
    } catch (err) {
      setBanner({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementPayment = async () => {
    if (!settlementPayment) return;
    setSubmitting(true);
    try {
      const res = await account360API.recordSettlementPayment(accountRef, settlementPayment.id, paymentForm);
      if (res.status === 1) {
        setBanner({ type: 'success', message: 'Settlement payment recorded — account closed' });
        setSettlementPayment(null);
        setPaymentForm({ amountPaid: '', paymentMode: 'cash' });
        await load();
      }
    } catch (err) {
      setBanner({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemark = async () => {
    setSubmitting(true);
    try {
      await account360API.addRemark(accountRef, {
        remark: remarkForm.remark,
        remarkType: remarkForm.remarkType,
        nextFollowUpDate: remarkForm.nextFollowUpDate || undefined,
      });
      setShowRemark(false);
      setRemarkForm({ remarkType: 'general', remark: '', nextFollowUpDate: '' });
      setBanner({ type: 'success', message: 'Remark added' });
      await load();
    } catch (err) {
      setBanner({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueNoc = async () => {
    if (!window.confirm('Generate the NOC now and email it to the customer?')) return;
    setSubmitting(true);
    try {
      const res = await account360API.issueNoc(accountRef);
      if (res.status === 1) {
        setBanner({ type: 'success', message: 'NOC generated and emailed to customer' });
        await load();
      }
    } catch (err) {
      setBanner({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePtpStatus = async (ptpId, status) => {
    try {
      await account360API.updatePtpStatus(accountRef, ptpId, { status, remarks: `Marked ${status}` });
      await load();
    } catch (err) {
      setBanner({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" variant="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Account 360</h1>
            <p className="text-xs text-slate-500">
              {account?.loanAccountNumber || accountRef}
              {customer?.name ? ` · ${customer.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          {customer?.customerCode && (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={customerHistoryPath(customer.customerCode)}>Customer record</Link>
            </Button>
          )}
          {account?.applicationNumber && (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={applicationDetailPath(account.applicationNumber)}>Application</Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {banner.message && (
        <Alert className={banner.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}>
          <AlertDescription>{banner.message}</AlertDescription>
        </Alert>
      )}

      {data && !account?.isLeadOnly && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Loan account</p>
              <p className="font-mono text-sm font-bold text-slate-900 mt-1">
                {shortLoanLabel(account.loanAccountNumber) || account.loanAccountNumber}
              </p>
              <p className="text-xs text-slate-500 mt-1">{formatStatusLabel(account.status)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Outstanding</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {inr(financials?.totalOutstanding)}
              </p>
              {account.status === 'closed' && (
                <p className="text-xs text-slate-500 mt-1">Loan closed · nothing due</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payable as of today</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {inr(financials?.amountPayableAsOfToday ?? financials?.interest?.earlySettlementAmount)}
              </p>
              {Number(financials?.payableLateCharge) > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Includes {inr(financials.payableLateCharge)} late charge
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Part paid</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {inr(financials?.prepaidTotal ?? 0)}
              </p>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-slate-500">DPD:</span> {account.dpd || 0} days</p>
              <p><span className="text-slate-500">Bucket:</span> {account.bucket?.name || '—'}</p>
              <p><span className="text-slate-500">Next EMI:</span> {formatDate(financials?.nextEmiDue)}</p>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-slate-500">Customer:</span> {customer?.customerCode}</p>
              <p><span className="text-slate-500">PAN:</span> <span className="font-mono">{customer?.pan || '—'}</span></p>
              <p><span className="text-slate-500">City:</span> {customer?.city || '—'}</p>
            </div>
          </div>
          <FlatFineBreakdown fine={financials?.interest?.flatFine} />

          <div className="flex flex-wrap gap-2">
            {account.status === 'disbursed' && (
              <Button size="sm" onClick={() => setShowCollectionPunch(true)}>
                <HandCoins className="w-3.5 h-3.5 mr-1" /> Record collection
              </Button>
            )}
            {actions.canCreatePtp && (
              <Button size="sm" variant="outline" onClick={() => setShowPtp(true)}>
                <Clock className="w-3.5 h-3.5 mr-1" /> Create PTP
              </Button>
            )}
            {actions.canInitiateSettlement && isMaker && (
              <Button size="sm" variant="outline" onClick={() => setShowSettlement(true)}>
                <Scale className="w-3.5 h-3.5 mr-1" /> Initiate settlement
              </Button>
            )}
            {actions.canAddRemark && (
              <Button size="sm" variant="outline" onClick={() => setShowRemark(true)}>
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Add remark
              </Button>
            )}
          </div>

          <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {financials?.summary && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-100 p-3">
                      <p className="text-xs text-slate-500">Loan amount</p>
                      <p className="text-lg font-bold tabular-nums">{inr(financials.summary.loanAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-3">
                      <p className="text-xs text-slate-500">Total paid</p>
                      <p className="text-lg font-bold text-emerald-600 tabular-nums">{inr(financials.summary.totalPaid)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-3">
                      <p className="text-xs text-slate-500">Outstanding</p>
                      <p className="text-lg font-bold tabular-nums">{inr(financials.summary.outstanding)}</p>
                    </div>
                  </div>
                )}
                {financials?.disbursement && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p><span className="text-slate-500">Disbursed:</span> {financials.disbursement.disbursedDate || '—'}</p>
                      <p><span className="text-slate-500">Repayment date:</span> {financials.disbursement.repaymentDate || '—'}</p>
                      <p><span className="text-slate-500">Bank:</span> {financials.disbursement.bank || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="text-slate-500">Net disbursed:</span> {inr(financials.disbursement.netDisbursed)}</p>
                      <p><span className="text-slate-500">Expected repayment:</span> {inr(financials.disbursement.expectedRepayment)}</p>
                    </div>
                  </div>
                )}
                {financials?.soaSnapshot?.transactions?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-2">Statement of account</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500 border-b">
                            <th className="py-2 pr-2">Date</th>
                            <th className="py-2 pr-2">Description</th>
                            <th className="py-2 pr-2 text-right">Debit</th>
                            <th className="py-2 pr-2 text-right">Credit</th>
                            <th className="py-2 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financials.soaSnapshot.transactions.map((tx, idx) => (
                            <tr key={idx} className="border-b border-slate-50">
                              <td className="py-1.5 pr-2 font-mono">{tx.date}</td>
                              <td className="py-1.5 pr-2">{tx.description}</td>
                              <td className="py-1.5 pr-2 text-right tabular-nums">{tx.debit ? inr(tx.debit) : '—'}</td>
                              <td className="py-1.5 pr-2 text-right tabular-nums">{tx.credit ? inr(tx.credit) : '—'}</td>
                              <td className="py-1.5 text-right tabular-nums">{inr(tx.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ptp' && (
              <div className="space-y-2">
                {(data.ptps || []).length === 0 && <p className="text-sm text-slate-500">No PTP records</p>}
                {(data.ptps || []).map((ptp) => (
                  <div key={ptp.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold">{inr(ptp.promise_amount)} by {formatDate(ptp.promise_date)}</p>
                      <p className="text-xs text-slate-500 capitalize">{ptp.ptp_status} · {ptp.remarks || '—'}</p>
                    </div>
                    {ptp.ptp_status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handlePtpStatus(ptp.id, 'kept')}>Kept</Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handlePtpStatus(ptp.id, 'broken')}>Broken</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-2">
                {(data.payments || []).length === 0 && <p className="text-sm text-slate-500">No payments recorded</p>}
                {(data.payments || []).map((p) => (
                  <div key={p.id} className="flex justify-between items-center border border-slate-100 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold capitalize">{p.type.replace(/_/g, ' ')} · {inr(p.amount)}</p>
                      <p className="text-xs text-slate-500">{p.description} · {formatDate(p.date)}</p>
                    </div>
                    <span className="text-[11px] uppercase text-slate-400">{p.mode || p.status}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'settlement' && (
              <div className="space-y-2">
                {(data.settlements || []).length === 0 && <p className="text-sm text-slate-500">No settlement requests</p>}
                {(data.settlements || []).map((s) => (
                  <div key={s.id} className="border border-slate-100 rounded-lg px-3 py-2 text-sm space-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-semibold">₹{s.proposed_settlement_amount} of ₹{s.original_due_amount}</p>
                        <p className="text-xs text-slate-500 capitalize">{s.status.replace(/_/g, ' ')} · {s.reason_for_settlement || '—'}</p>
                      </div>
                      <div className="flex gap-1">
                        {s.status === 'pending_approval' && isChecker && canApproveSettlement(admin, s.requested_by_admin) && (
                          <>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => setSettlementAction(s)}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => { setSettlementAction(s); setActionRemarks('Rejected'); }}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <Button size="sm" className="h-7 text-[11px]" onClick={() => {
                            setSettlementPayment(s);
                            setPaymentForm({ amountPaid: String(s.proposed_settlement_amount), paymentMode: 'cash' });
                          }}>
                            Record payment
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'collection' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold mb-2">Remarks</h3>
                  {(data.collectionRemarks || []).length === 0 && <p className="text-sm text-slate-500">No remarks</p>}
                  {(data.collectionRemarks || []).map((r) => (
                    <div key={r.id} className="text-sm border-b border-slate-100 py-2">
                      <p className="font-medium capitalize">{r.remark_type?.replace(/_/g, ' ')}</p>
                      <p className="text-slate-700">{r.remarks}</p>
                      <p className="text-[11px] text-slate-400">{r.admin_name} · {formatDate(r.created_at)}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-2">Call logs</h3>
                  {(data.callLogs || []).length === 0 && <p className="text-sm text-slate-500">No calls logged</p>}
                  {(data.callLogs || []).map((log) => (
                    <div key={log.id} className="text-sm border-b border-slate-100 py-2">
                      <p className="font-semibold capitalize">{String(log.call_status || '').replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-slate-500">{log.admin_name} · {formatDate(log.created_at)}</p>
                      {log.remarks && <p className="text-slate-700 text-[12px]">{log.remarks}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'noc' && (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-slate-100 p-4">
                  <p className="text-[11px] uppercase text-slate-400 font-semibold">NOC status</p>
                  <p className="text-lg font-bold capitalize mt-1">{data.noc?.status || 'none'}</p>
                  {data.noc?.status === 'scheduled' && (
                    <p className="text-slate-600 mt-2">
                      NOC will be issued on {formatDate(data.noc.eligibleAt)} (3 days after closure).
                    </p>
                  )}
                  {data.noc?.issuedAt && (
                    <p className="text-slate-600 mt-1">Issued on {formatDate(data.noc.issuedAt)}</p>
                  )}
                  {data.noc?.downloadUrl && (
                    <Button size="sm" className="mt-3" asChild>
                      <a href={data.noc.downloadUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Download NOC
                      </a>
                    </Button>
                  )}
                  {account.status === 'closed' && data.noc?.status === 'scheduled' && (
                    <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> NOC is scheduled and will be sent to the customer after the cooling period. If the customer needs it urgently, you can generate it now.
                    </p>
                  )}
                  {account.status === 'closed' && data.noc?.status !== 'issued' && (
                    <Button size="sm" className="mt-3" disabled={submitting} onClick={handleIssueNoc}>
                      <FileText className="w-3.5 h-3.5 mr-1" /> {submitting ? 'Generating…' : 'Generate NOC now'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <CollectionPunchModal
        open={showCollectionPunch}
        onOpenChange={setShowCollectionPunch}
        loanApplicationId={account?.applicationId}
        onSubmitted={() => {
          setBanner({ type: 'success', message: 'Collection submitted for approval' });
          load();
        }}
      />

      {showPtp && (
        <ModalShell title="Create PTP" onClose={() => setShowPtp(false)}>
          <CreatePtpForm
            form={ptpForm}
            setForm={setPtpForm}
            onSubmit={handlePtp}
            submitting={submitting}
            onCancel={() => setShowPtp(false)}
          />
        </ModalShell>
      )}

      {showSettlement && (
        <ModalShell title="Initiate settlement" onClose={() => setShowSettlement(false)}>
          <InitiateSettlementForm
            form={settlementForm}
            setForm={setSettlementForm}
            onSubmit={handleSettlementRequest}
            submitting={submitting}
            onCancel={() => setShowSettlement(false)}
            outstandingLabel={inr(financials?.settlementDetails?.totalOutstanding)}
          />
        </ModalShell>
      )}

      {showRemark && (
        <ModalShell title="Add collection remark" onClose={() => setShowRemark(false)}>
          <AddCollectionRemarkForm
            form={remarkForm}
            setForm={setRemarkForm}
            onSubmit={handleRemark}
            submitting={submitting}
            onCancel={() => setShowRemark(false)}
          />
        </ModalShell>
      )}

      {settlementAction && (
        <ModalShell title="Settlement action" onClose={() => setSettlementAction(null)}>
          <Input placeholder="Remarks" value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={submitting} onClick={() => handleSettlementAction('approved')}>Approve</Button>
            <Button variant="outline" className="flex-1" disabled={submitting} onClick={() => handleSettlementAction('rejected')}>Reject</Button>
          </div>
        </ModalShell>
      )}

      {settlementPayment && (
        <ModalShell title="Record settlement payment" onClose={() => setSettlementPayment(null)}>
          <Input type="number" placeholder="Amount paid" value={paymentForm.amountPaid} onChange={(e) => setPaymentForm((f) => ({ ...f, amountPaid: e.target.value }))} />
          <Input placeholder="Payment mode" value={paymentForm.paymentMode} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMode: e.target.value }))} />
          <Button onClick={handleSettlementPayment} disabled={submitting} className="w-full">Record & close account</Button>
        </ModalShell>
      )}
    </div>
  );
}
