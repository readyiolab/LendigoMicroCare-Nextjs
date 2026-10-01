import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/lib/router';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { PageLoader } from '@/components/ui/PageLoader';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_UI = {
  under_review: {
    icon: Clock,
    ring: 'bg-amber-50 border-amber-200 text-amber-700',
    card: 'border-amber-100 bg-amber-50/40',
  },
  approved: {
    icon: CheckCircle2,
    ring: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    card: 'border-emerald-100 bg-emerald-50/40',
  },
  rejected: {
    icon: XCircle,
    ring: 'bg-red-50 border-red-200 text-red-700',
    card: 'border-red-100 bg-red-50/40',
  },
  draft: {
    icon: FileText,
    ring: 'bg-blue-50 border-blue-200 text-blue-700',
    card: 'border-blue-100 bg-blue-50/40',
  },
};

export default function DsaApplicationStatus() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await dsaAPI.getApplicationStatus(applicationId);
        const { ok, data, message } = unwrapDsaResponse(res);
        if (ok) {
          setPayload(data);
          if (data?.display?.phase === 'draft' && data?.application?.assisted_token) {
            navigate(`/admin/applications/fill/${data.application.assisted_token}`, { replace: true });
            return;
          }
        } else {
          setError(message || 'Could not load status');
        }
      } catch (e) {
        setError(e.message || 'Could not load status');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId, navigate]);

  if (loading) return <PageLoader text="Loading application status…" />;

  const app = payload?.application;
  const display = payload?.display;
  const phase = display?.phase || 'under_review';
  const ui = PHASE_UI[phase] || PHASE_UI.under_review;
  const Icon = ui.icon;

  const amount =
    app?.approved_amount || app?.disbursement_amount || app?.principal_amount;

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-10">
      <Button
        variant="ghost"
        className="rounded-lg -ml-2"
        onClick={() => navigate('/admin/dsa/applications')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to applications
      </Button>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className={cn('rounded-lg border p-8 text-center shadow-sm', ui.card)}>
        <div
          className={cn(
            'w-16 h-16 rounded-lg border flex items-center justify-center mx-auto mb-5',
            ui.ring
          )}
        >
          <Icon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{display?.title}</h1>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">{display?.message}</p>
      </div>

      <div className="rounded-lg border border-slate-100 bg-white p-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Application #</span>
          <span className="font-mono font-medium">{app?.application_number || applicationId}</span>
        </div>
        {app?.lead_code && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Lead code</span>
            <span className="font-mono">{app.lead_code}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Customer</span>
          <span className="font-medium capitalize text-right">
            {app?.customer_name || '—'}
            <br />
            <span className="text-xs text-slate-500 font-normal">{app?.customer_mobile}</span>
          </span>
        </div>
        {amount != null && Number(amount) > 0 && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-slate-500">Amount</span>
            <span className="font-semibold flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" />
              {Number(amount).toLocaleString('en-IN')}
            </span>
          </div>
        )}
        {app?.submitted_at && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Submitted on</span>
            <span>
              {new Date(app.submitted_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-lg"
          onClick={() => navigate('/admin/dsa/leads')}
        >
          All leads
        </Button>
        <Button className="flex-1 rounded-lg" onClick={() => navigate('/admin/dsa/applications')}>
          Applications list
        </Button>
      </div>
    </div>
  );
}
