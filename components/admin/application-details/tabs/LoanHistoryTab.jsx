import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from '@/lib/router';
import { ExternalLink, RotateCw } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getStatusBadge } from '@/utils/statusUtils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DataTable, DataCell, EMPTY } from '../common/DetailTable';

const COLUMNS = [
  { key: 'lead', label: 'Lead ID' },
  { key: 'lan', label: 'LAN' },
  { key: 'applied', label: 'Applied On' },
  { key: 'amount', label: 'Requested / Approved' },
  { key: 'tenure', label: 'Tenure' },
  { key: 'status', label: 'Status' },
  { key: 'disbursed', label: 'Disbursed On' },
  { key: 'repayment', label: 'Repayment Date' },
  { key: 'closed', label: 'Closed On' },
  { key: 'dpd', label: 'Max DPD' },
  { key: 'open', label: '' },
];

function formatDate(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₹${n.toLocaleString('en-IN')}`;
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

export default function LoanHistoryTab() {
  const { applicationId, loanApp } = useApplicationContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setError('');
    try {
      const resp = await adminAPI.getApplicationLoanHistory(applicationId);
      if (resp?.status !== 1) {
        setError(resp?.message || 'Failed to load loan history');
        setHistory(null);
        return;
      }
      setHistory(resp.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load loan history');
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const currentId = Number(history?.currentApplicationId || loanApp?.id);
  const loans = history?.loans || [];
  const summary = history?.summary || { total: 0, disbursed: 0, closed: 0, active: 0 };
  const hasOtherLoans = loans.some((loan) => Number(loan.id) !== currentId);

  const openApplication = (loanId) => {
    if (!loanId || Number(loanId) === currentId) return;
    navigate(`/admin/applications/${loanId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="py-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat label="Total applications" value={summary.total} />
          <SummaryStat label="Disbursed" value={summary.disbursed} />
          <SummaryStat label="Active" value={summary.active} />
          <SummaryStat label="Closed" value={summary.closed} />
        </div>
      )}

      <DataTable
        title="Customer Loan History"
        columns={COLUMNS}
        emptyMessage={error ? 'Loan history unavailable' : 'No loans found for this customer'}
        action={(
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadHistory}
            className="h-7 px-2.5 text-xs border-slate-200"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        )}
      >
        {loans.length > 0
          ? loans.map((loan) => {
            const isCurrent = Number(loan.id) === currentId;
            const requested = formatAmount(loan.principal_amount);
            const approved = formatAmount(loan.approved_amount);
            const dpd = Number(loan.max_dpd_days) || 0;
            return (
              <tr
                key={loan.id}
                onClick={() => openApplication(loan.id)}
                className={cn(
                  isCurrent ? '[&>td]:bg-slate-50' : 'cursor-pointer [&>td]:hover:bg-slate-50'
                )}
                title={isCurrent ? 'You are viewing this application' : 'Open this application'}
              >
                <DataCell mono>
                  <span className="inline-flex items-center gap-2">
                    {isCurrent ? (
                      loan.lead_id || `#${loan.id}`
                    ) : (
                      <Link
                        to={`/admin/applications/${loan.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-700 hover:underline"
                      >
                        {loan.lead_id || `#${loan.id}`}
                      </Link>
                    )}
                    {isCurrent && (
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 font-sans">
                        Current
                      </span>
                    )}
                  </span>
                </DataCell>
                <DataCell mono>{loan.loan_account_number}</DataCell>
                <DataCell muted>{formatDate(loan.created_at)}</DataCell>
                <DataCell mono>
                  {requested || approved ? `${requested || EMPTY} / ${approved || EMPTY}` : null}
                </DataCell>
                <DataCell>{loan.tenure_days ? `${loan.tenure_days} days` : null}</DataCell>
                <DataCell>{getStatusBadge(loan.application_status)}</DataCell>
                <DataCell muted>{formatDate(loan.disbursed_at)}</DataCell>
                <DataCell muted>{formatDate(loan.repayment_date)}</DataCell>
                <DataCell muted>{formatDate(loan.closed_at)}</DataCell>
                <DataCell mono className={cn(dpd > 30 ? 'text-red-600' : dpd > 0 ? 'text-amber-600' : '')}>
                  {dpd}
                </DataCell>
                <DataCell>
                  {!isCurrent && (
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                  )}
                </DataCell>
              </tr>
            );
          })
          : null}
      </DataTable>

      {!error && loans.length > 0 && !hasOtherLoans && (
        <p className="text-xs text-slate-500">This is the customer&apos;s first application — no earlier loans on record.</p>
      )}
    </div>
  );
}
