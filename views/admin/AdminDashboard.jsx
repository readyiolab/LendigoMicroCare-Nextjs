import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@/lib/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowUpRight } from 'lucide-react';

import ApplicationKpiMetrics from '@/components/admin/dashboard/ApplicationKpiMetrics.jsx';

export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await adminAPI.getDashboard();
        if (!cancelled && response.status === 1) {
          setDashboard(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canViewAnalytics = useMemo(
    () => ['super_admin', 'operations_manager'].includes(admin?.role),
    [admin]
  );

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time portfolio KPIs, disbursements, repayments, and pipeline velocity
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(canViewAnalytics ? '/admin/analytics' : '/admin/applications')}
          className="inline-flex items-center gap-1.5 self-start h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          Revenue Detail
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-lg border-red-200 bg-red-50 py-3">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <ApplicationKpiMetrics
          applications={dashboard?.applications}
          amounts={dashboard?.amounts}
          users={dashboard?.users}
          loading={loading}
        />
      </div>
    </div>
  );
}
