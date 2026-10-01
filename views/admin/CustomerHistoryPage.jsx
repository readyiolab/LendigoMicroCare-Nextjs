import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from '@/lib/router';
import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { applicationDetailPath } from '@/utils/applicationRef';
import { formatStatusLabel } from '@/utils/statusUtils';
import { shortLeadLabel, shortLoanLabel, account360Path, isLoanAccountQuery } from '@/utils/customerIdentity';
import { ChevronLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import CallRecordingPlayer from '@/components/admin/CallRecordingPlayer';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CustomerHistoryPage() {
  const { customerCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = customerCode || searchParams.get('q') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!query) {
      setError('Enter a Customer ID or PAN');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.lookupCustomer(query);
      if (response.status === 1) {
        setData(response.data);
      } else {
        setError(response.message || 'Customer not found');
        setData(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Customer not found');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (query && isLoanAccountQuery(query)) {
      navigate(account360Path(query), { replace: true });
    }
  }, [query, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const customer = data?.customer;
  const leads = data?.leads || [];
  const references = data?.references || [];
  const callLogs = data?.callLogs || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 border-slate-200"
          onClick={() => navigate('/admin/applications')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">Customer record</h1>
          <p className="text-xs text-slate-500">Same history from Customer ID or PAN</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" variant="primary" />
        </div>
      )}

      {error && !loading && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {!loading && customer && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Customer ID</p>
              <p className="font-mono text-sm font-bold text-slate-900 mt-1">{customer.customer_code || '—'}</p>
              <p className="text-sm font-semibold text-slate-800 mt-2">{customer.full_name || '—'}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-slate-500">Mobile:</span> <span className="font-mono">{customer.mobile || '—'}</span></p>
              <p><span className="text-slate-500">PAN:</span> <span className="font-mono">{customer.pancard || '—'}</span></p>
              <p><span className="text-slate-500">City:</span> {customer.city || '—'}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-slate-500">Company:</span> {customer.company_name || '—'}</p>
              <p>
                <span className="text-slate-500">References:</span>{' '}
                <span className="font-semibold capitalize">{customer.reference_verification_status || 'pending'}</span>
              </p>
              <p className="text-slate-500">
                {data.summary?.total_leads || 0} leads · {data.summary?.total_loan_accounts || 0} loan accounts
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">Leads and loan accounts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[12px] text-slate-500 border-b">
                    <th className="px-4 py-2">Lead</th>
                    <th className="px-4 py-2">Loan Acc</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">City</th>
                    <th className="px-4 py-2">Telecaller</th>
                    <th className="px-4 py-2">Credit Manager</th>
                    <th className="px-4 py-2">Lock</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-[12px]">{shortLeadLabel(lead.lead_id) || lead.lead_id}</td>
                      <td className="px-4 py-2 font-mono text-[12px]">
                        {lead.loan_account_number ? (
                          <button
                            type="button"
                            className="text-blue-700 hover:underline font-mono"
                            onClick={() => navigate(account360Path(lead.loan_account_number))}
                          >
                            {shortLoanLabel(lead.loan_account_number) || lead.loan_account_number}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2">{formatStatusLabel(lead.application_status)}</td>
                      <td className="px-4 py-2">{lead.city || '—'}</td>
                      <td className="px-4 py-2">{lead.assigned_admin_name || '—'}</td>
                      <td className="px-4 py-2">{lead.credit_admin_name || '—'}</td>
                      <td className="px-4 py-2">
                        {lead.locked_admin_name ? (
                          <span className="text-amber-700 text-[12px]">In progress · {lead.locked_admin_name}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2 font-mono text-[12px]">{formatDate(lead.submitted_at || lead.created_at)}</td>
                      <td className="px-4 py-2 text-right space-x-1">
                        {lead.loan_account_number ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="h-7 text-[11px]"
                            onClick={() => navigate(account360Path(lead.loan_account_number))}
                          >
                            Open account
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => navigate(applicationDetailPath(lead.application_number || lead.id))}
                          >
                            Open lead
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-900 mb-3">References</h2>
              {references.length === 0 && <p className="text-sm text-slate-500">No references captured</p>}
              <div className="space-y-2">
                {references.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-semibold">{ref.reference_name}</p>
                      <p className="font-mono text-[12px] text-slate-600">{ref.reference_mobile}</p>
                    </div>
                    <span className={`text-[11px] font-semibold uppercase ${ref.verification_status === 'verified' ? 'text-emerald-700' : ref.verification_status === 'failed' ? 'text-rose-700' : 'text-amber-700'}`}>
                      {ref.verification_status === 'verified' ? (
                        <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Verified</span>
                      ) : ref.verification_status === 'failed' ? (
                        <span className="inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>
                      ) : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Call logs</h2>
              {callLogs.length === 0 && <p className="text-sm text-slate-500">No calls logged</p>}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {callLogs.map((log) => (
                  <div key={log.id} className="text-sm border-b border-slate-100 pb-2">
                    <p className="font-semibold capitalize">{String(log.call_status || '').replace(/_/g, ' ')}</p>
                    <p className="text-slate-500 text-[12px]">
                      {log.admin_name || 'Staff'} · {formatDate(log.created_at)}
                      {log.reference_name ? ` · Ref: ${log.reference_name}` : ''}
                    </p>
                    {log.remarks && <p className="text-slate-700 text-[12px] mt-0.5">{log.remarks}</p>}
                    {log.recording_url && (
                      <CallRecordingPlayer
                        src={log.recording_url}
                        className="mt-1 h-8 w-full max-w-[220px]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
