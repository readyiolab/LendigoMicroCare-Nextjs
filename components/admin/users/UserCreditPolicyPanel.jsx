import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Shield, CheckCircle2, XCircle, Calendar, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserCreditPolicyPanel({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await adminAPI.getUserCreditPolicy(userId);
      if (res?.status === 1) setData(res.data);
    } catch (e) {
      setMsg(e.message || 'Failed to load credit policy');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const clearCoolOff = async () => {
    setActing(true);
    setMsg('');
    try {
      const res = await adminAPI.clearUserCreditCoolOff(userId, { note });
      if (res?.status === 1) {
        setData(res.data);
        setMsg('Cool-off cleared.');
        setNote('');
      }
    } catch (e) {
      setMsg(e.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const restore = async () => {
    setActing(true);
    setMsg('');
    try {
      const res = await adminAPI.restoreUserCreditEligibility(userId, { note });
      if (res?.status === 1) {
        setData(res.data);
        setMsg('Eligibility restored. Customer notified if enabled in settings.');
        setNote('');
      }
    } catch (e) {
      setMsg(e.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400 py-4">Loading credit policy…</p>;
  if (!data) return null;

  const ev = data.evaluation || {};
  const prof = data.profile || {};

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          Credit & re-loan
        </h4>
        <button type="button" onClick={load} className="p-1 rounded hover:bg-white">
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      <div
        className={cn(
          'rounded-lg px-3 py-2.5 text-sm border flex items-start gap-2',
          ev.allowed
            ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
            : 'bg-amber-50 border-amber-100 text-amber-900'
        )}
      >
        {ev.allowed ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-semibold">{ev.allowed ? 'Can apply' : 'Blocked'}</p>
          <p className="text-xs mt-0.5 opacity-90">{ev.userMessage || ev.code}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white rounded-lg p-2 border border-slate-100">
          <dt className="text-slate-400">Risk status</dt>
          <dd className="font-semibold text-slate-800 capitalize">{prof.credit_risk_status || '—'}</dd>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-100">
          <dt className="text-slate-400">Re-loan flag</dt>
          <dd className="font-semibold">{prof.eligible_for_reloan === 1 ? 'Yes' : 'No'}</dd>
        </div>
        {data.cibil?.score != null && (
          <div className="bg-white rounded-lg p-2 border border-slate-100">
            <dt className="text-slate-400">CIBIL</dt>
            <dd className="font-semibold">{data.cibil.score}</dd>
          </div>
        )}
        {data.blacklisted && (
          <div className="bg-red-50 rounded-lg p-2 border border-red-100 col-span-2">
            <dt className="text-red-600">Blacklisted</dt>
            <dd className="text-red-800">{data.blacklistReason}</dd>
          </div>
        )}
        {prof.reloan_blocked_until && (
          <div className="bg-white rounded-lg p-2 border border-slate-100 col-span-2 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <dt className="text-slate-400">Blocked until</dt>
              <dd className="font-semibold">
                {new Date(prof.reloan_blocked_until).toLocaleString('en-IN')}
              </dd>
            </div>
          </div>
        )}
      </dl>

      {prof.reloan_block_reason && (
        <p className="text-[11px] text-slate-500 bg-white rounded-lg p-2 border border-slate-100">
          {prof.reloan_block_reason}
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Admin note (optional)"
        rows={2}
        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={acting}
          onClick={clearCoolOff}
          className="text-xs font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
        >
          Clear cool-off
        </button>
        <button
          type="button"
          disabled={acting}
          onClick={restore}
          className="text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Restore eligibility
        </button>
      </div>

      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
