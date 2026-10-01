import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Shield, Save, RefreshCw, Mail, MessageSquare, Bell } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const FIELD_META = [
  { key: 'credit_min_cibil_first_time', label: 'Min CIBIL (first loan)', type: 'number' },
  { key: 'credit_min_cibil_repeat', label: 'Min CIBIL (repeat customer)', type: 'number' },
  { key: 'credit_cibil_max_age_days', label: 'CIBIL max age (days)', type: 'number' },
  { key: 'credit_reject_cool_off_days', label: 'Cool-off after rejection (days)', type: 'number' },
  { key: 'credit_settlement_cool_off_months', label: 'Cool-off after settlement (months)', type: 'number' },
  { key: 'credit_settlement_blacklist_waiver_pct', label: 'Auto-blacklist if waiver ≥ (%)', type: 'number' },
  { key: 'credit_default_cool_off_months', label: 'Block after default (months)', type: 'number' },
  { key: 'credit_max_bureau_overdue', label: 'Max bureau overdue (₹)', type: 'number' },
  { key: 'credit_max_bureau_dpd', label: 'Max bureau DPD (days)', type: 'number' },
  { key: 'credit_notify_email', label: 'Email on block', type: 'boolean' },
  { key: 'credit_notify_sms', label: 'SMS on block', type: 'boolean' },
  { key: 'credit_notify_cooloff_end', label: 'Email when cool-off ends', type: 'boolean' },
];

export default function AdminCreditPolicy() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCreditPolicySettings();
      if (res?.status === 1) {
        const map = {};
        (res.data?.settings || []).forEach((s) => {
          map[s.setting_key] =
            s.setting_type === 'boolean' ? s.setting_value === '1' : s.setting_value;
        });
        setValues(map);
      }
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setBanner({ type: '', text: '' });
    try {
      const settings = FIELD_META.map((f) => ({
        key: f.key,
        value: f.type === 'boolean' ? (values[f.key] ? '1' : '0') : String(values[f.key] ?? ''),
      }));
      const res = await adminAPI.updateCreditPolicySettings({ settings });
      if (res?.status === 1) {
        setBanner({ type: 'success', text: 'Credit policy saved. New applications use these rules immediately.' });
      } else {
        setBanner({ type: 'error', text: res?.message || 'Save failed' });
      }
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Credit & re-loan policy
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bank-style gates: CIBIL, bureau settlement, internal default, cool-offs, and customer alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {banner.text && (
        <div
          className={cn(
            'rounded-lg px-4 py-3 text-sm border',
            banner.type === 'error'
              ? 'bg-red-50 border-red-100 text-red-800'
              : 'bg-emerald-50 border-emerald-100 text-emerald-800'
          )}
        >
          {banner.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Spinner className="h-4 w-4" />
          Loading policy settings…
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
          <div className="px-5 py-3 bg-slate-50 rounded-t-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Thresholds</p>
          </div>
          {FIELD_META.filter((f) => f.type === 'number').map((f) => (
            <label key={f.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-sm text-slate-700">{f.label}</span>
              <input
                type="number"
                className="w-28 h-10 rounded-lg border border-slate-200 px-3 text-sm text-right font-semibold tabular-nums"
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </label>
          ))}
          <div className="px-5 py-3 bg-slate-50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </p>
          </div>
          {FIELD_META.filter((f) => f.type === 'boolean').map((f) => (
            <label
              key={f.key}
              className="flex items-center justify-between gap-4 px-5 py-3.5 cursor-pointer"
            >
              <span className="text-sm text-slate-700 flex items-center gap-2">
                {f.key.includes('email') ? (
                  <Mail className="w-4 h-4 text-slate-400" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                )}
                {f.label}
              </span>
              <input
                type="checkbox"
                checked={Boolean(values[f.key])}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.checked }))}
                className="w-5 h-5 rounded border-slate-300"
              />
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || loading}
        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : 'Save policy'}
      </button>
    </div>
  );
}
