import { useCallback, useEffect, useState } from 'react';
import { collectionAPI } from '@/lib/api/collection';
import { Button } from '@/components/ui/button';
import CollectionSection from '@/components/admin/collections/shared/CollectionSection';

export default function CollectionTeamPanel() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await collectionAPI.getCollectionTeam();
      if (res.status === 1) setRows(res.data || []);
      else setError(res.message || 'Could not load the team');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load the team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CollectionSection
      title="Team"
      subtitle="Each collection executive’s promises, follow-ups, visits, and payments waiting for approval"
    >
      <div className="mb-3">
        <Button type="button" size="sm" variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {loading ? <p className="text-xs text-slate-500">Loading team…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="text-xs text-slate-500">No collection executives yet. Ask a super admin to add them and set Reports to you.</p>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="border border-slate-100 divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.id} className="px-3 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{row.full_name}</p>
                <p className="text-slate-500">{row.email}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-slate-600">
                <span>{row.assigned_loans || 0} cases</span>
                <span>{row.ptp_due || 0} PTP</span>
                <span>{row.followups_due || 0} follow-ups</span>
                <span>{row.visits_due || 0} visits</span>
                <span>{row.punches_pending || 0} payments waiting</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </CollectionSection>
  );
}
