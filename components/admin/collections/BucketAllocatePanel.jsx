import { useCallback, useEffect, useState } from 'react';
import { Users, RefreshCw, UserPlus } from 'lucide-react';
import { collectionAPI } from '@/lib/api/collection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CollectionSection from '@/components/admin/collections/shared/CollectionSection';

export default function BucketAllocatePanel() {
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [agents, setAgents] = useState([]);
  const [eligibleAdmins, setEligibleAdmins] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [form, setForm] = useState({ adminId: '', bucketId: '', dailyWorkloadLimit: 50 });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await collectionAPI.getCollectionAgents();
      if (res.status === 1) {
        setAgents(res.data?.agents || []);
        setEligibleAdmins(res.data?.eligibleAdmins || []);
        setBuckets(res.data?.buckets || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAllocate = async () => {
    setAllocating(true);
    setMessage('');
    setError('');
    try {
      const res = await collectionAPI.allocateAgents();
      if (res.status === 1) {
        setMessage(res.data?.message || `Assigned ${res.data?.assignedCount || 0} loans`);
      } else {
        setError(res.message || 'Allocation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const handleSaveAgent = async () => {
    if (!form.adminId || !form.bucketId) {
      setError('Select a collection executive and a bucket');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await collectionAPI.upsertCollectionAgent({
        adminId: Number(form.adminId),
        bucketId: Number(form.bucketId),
        dailyWorkloadLimit: Number(form.dailyWorkloadLimit) || 50,
        isActive: 1,
      });
      setMessage('Agent–bucket mapping saved');
      setForm({ adminId: '', bucketId: '', dailyWorkloadLimit: 50 });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <CollectionSection
        title="Assign collectors"
        subtitle="Map each collection executive to a DPD bucket, then assign overdue loans to their queue"
      >
        <div className="flex flex-wrap gap-2 mb-4">
          <Button type="button" size="sm" onClick={handleAllocate} disabled={allocating} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${allocating ? 'animate-spin' : ''}`} />
            {allocating ? 'Allocating…' : 'Run allocation'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>

        {message && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">{message}</p>}
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <select
            className="h-9 border border-slate-200 rounded-lg text-xs px-2 bg-white"
            value={form.adminId}
            onChange={(e) => setForm((f) => ({ ...f, adminId: e.target.value }))}
          >
            <option value="">Select collection executive</option>
            {eligibleAdmins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
          <select
            className="h-9 border border-slate-200 rounded-lg text-xs px-2 bg-white"
            value={form.bucketId}
            onChange={(e) => setForm((f) => ({ ...f, bucketId: e.target.value }))}
          >
            <option value="">Select bucket</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bucket_name} ({b.min_dpd}–{b.max_dpd})
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            className="h-9 text-xs"
            value={form.dailyWorkloadLimit}
            onChange={(e) => setForm((f) => ({ ...f, dailyWorkloadLimit: e.target.value }))}
            placeholder="Cases per day"
          />
          <Button type="button" size="sm" className="h-9 gap-1.5" onClick={handleSaveAgent} disabled={saving}>
            <UserPlus className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Add / update'}
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : agents.length === 0 ? (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            No mappings yet. Map an executive to this bucket, then run allocation.
          </p>
        ) : (
          <div className="border border-slate-100 divide-y divide-slate-100">
            {agents.map((a) => (
              <div key={a.id} className="px-3 py-2 text-xs flex flex-wrap justify-between gap-2">
                <span className="font-medium text-slate-800">{a.full_name}</span>
                <span className="text-slate-500">
                  {a.bucket_name || a.bucket_code} · {a.daily_workload_limit} cases per day
                </span>
              </div>
            ))}
          </div>
        )}
      </CollectionSection>
    </div>
  );
}
