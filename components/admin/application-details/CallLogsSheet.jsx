import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, History, Mic, Phone, PhoneCall, PhoneOff, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import CallRecordingPlayer from '@/components/admin/CallRecordingPlayer';
import { adminAPI } from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import {
  CALL_RECORDING_ACCEPT,
  isAllowedRecordingFile,
  normalizeRecordingFile,
} from '@/lib/utils/callRecording';
import {
  CALL_OUTCOMES,
  CALL_PURPOSES,
  CONNECTED_OUTCOMES,
  formatCallWhen,
  outcomeMeta,
  parseCallRemarks,
  toneClasses,
} from '@/lib/utils/callLogOptions';

const EMPTY_FORM = { purpose: '', outcome: '', followUp: '', remarks: '', recording: null };

const fieldLabel = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const inputBase =
  'w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400';

function SummaryChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{value}</p>
    </div>
  );
}

function CallLogCard({ log }) {
  const meta = outcomeMeta(log.call_status);
  const { purpose, text } = parseCallRemarks(log.remarks);
  const role = log.role_name || null;
  return (
    <li className="relative pl-6">
      <span
        className={cn('absolute left-0 top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white', meta.classes.dot)}
        aria-hidden
      />
      <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              meta.classes.badge
            )}
          >
            {meta.label}
          </span>
          {purpose ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {purpose}
            </span>
          ) : null}
          <span className="ml-auto text-[11px] font-medium text-slate-500 tabular-nums">
            {formatCallWhen(log.created_at)}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] text-slate-500">
          by <span className="font-semibold text-slate-700">{log.admin_name || 'Staff'}</span>
          {role ? <span className="text-slate-500"> · {role}</span> : null}
          {log.reference_name ? <span className="text-slate-500"> · Reference: {log.reference_name}</span> : null}
        </p>
        {text ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{text}</p>
        ) : null}
        {log.recording_url ? (
          <div className="mt-2 flex items-center gap-2">
            <Mic className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <CallRecordingPlayer src={log.recording_url} className="h-8 w-full max-w-sm" />
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function CallLogsSheet({
  open,
  onOpenChange,
  applicationId,
  customerName,
  applicationLabel,
  mobile,
  followUpDate,
  canAdd = true,
  onLogged,
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const loadLogs = useCallback(
    async (force = false) => {
      if (!applicationId) return;
      setLoading(true);
      setLoadError('');
      try {
        const resp = await adminAPI.getCallLogs(applicationId, { force });
        if (resp?.status === 1) {
          setLogs(resp.data?.logs || resp.data || []);
        } else {
          setLoadError(resp?.message || 'Could not load call logs');
        }
      } catch (err) {
        setLoadError(err.message || 'Could not load call logs');
      } finally {
        setLoading(false);
      }
    },
    [applicationId]
  );

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setFormError('');
    setSavedMessage('');
    loadLogs(true);
  }, [open, loadLogs]);

  const previewUrl = useMemo(
    () => (form.recording ? URL.createObjectURL(form.recording) : ''),
    [form.recording]
  );
  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const summary = useMemo(() => {
    const connected = logs.filter((l) => CONNECTED_OUTCOMES.has(String(l.call_status || '').toLowerCase())).length;
    return {
      total: logs.length,
      connected,
      last: logs[0]?.created_at ? formatCallWhen(logs[0].created_at) : 'No calls yet',
      followUp: followUpDate ? formatCallWhen(followUpDate) : 'Not set',
    };
  }, [logs, followUpDate]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
    setSavedMessage('');
  };

  const handleRecordingChange = (e) => {
    const selected = e.target.files?.[0] || null;
    e.target.value = '';
    if (!selected) {
      setField('recording', null);
      return;
    }
    if (!isAllowedRecordingFile(selected)) {
      setFormError(
        'Please choose an audio file. MP3, M4A, WAV, OGG, AAC, AMR, 3GP, FLAC, WebM and similar formats are supported.'
      );
      return;
    }
    setField('recording', normalizeRecordingFile(selected));
  };

  const canSave = Boolean(form.purpose && form.outcome) && !saving;

  const handleSave = async () => {
    if (!form.purpose || !form.outcome) {
      setFormError('Choose the call purpose and outcome.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const remarks = [`[${form.purpose}]`, form.remarks.trim()].filter(Boolean).join(' ');
      let payload;
      if (form.recording) {
        payload = new FormData();
        payload.append('applicationId', applicationId);
        payload.append('status', form.outcome);
        payload.append('remarks', remarks);
        if (form.followUp) payload.append('followUpDate', form.followUp);
        payload.append('recording', form.recording);
      } else {
        payload = {
          applicationId,
          status: form.outcome,
          remarks,
          followUpDate: form.followUp || null,
        };
      }
      const resp = await adminAPI.logCall(payload);
      if (resp?.status === 1 || resp?.success) {
        setForm(EMPTY_FORM);
        setSavedMessage('Call log saved.');
        await loadLogs(true);
        onLogged?.();
      } else {
        setFormError(resp?.message || 'Failed to save call log');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save call log');
    } finally {
      setSaving(false);
    }
  };

  const telHref = mobile ? `tel:${String(mobile).replace(/[^\d+]/g, '')}` : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-slate-50 p-0">
        <SheetHeader className="border-b border-slate-200 bg-white px-5 py-4 pr-12">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <PhoneCall className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold text-slate-900">Call logs</SheetTitle>
              <SheetDescription className="text-xs text-slate-500 truncate">
                {[customerName, applicationLabel].filter(Boolean).join(' · ') || 'Application'}
              </SheetDescription>
            </div>
            {telHref ? (
              <a
                href={telHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Phone className="h-4 w-4" />
                Call {mobile}
              </a>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip icon={History} label="Total calls" value={summary.total} />
            <SummaryChip icon={CheckCircle2} label="Connected" value={summary.connected} />
            <SummaryChip icon={Clock} label="Last call" value={summary.last} />
            <SummaryChip icon={CalendarClock} label="Next follow-up" value={summary.followUp} />
          </div>
        </SheetHeader>

        <div className="space-y-5 px-5 py-4">
          {canAdd ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Add call</h3>
                <p className="text-xs text-slate-500">Record what happened on the call. Purpose and outcome are required.</p>
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="call-purpose">Purpose</label>
                <select
                  id="call-purpose"
                  value={form.purpose}
                  onChange={(e) => setField('purpose', e.target.value)}
                  className={inputBase}
                >
                  <option value="">Select purpose…</option>
                  {CALL_PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <p className={fieldLabel}>Outcome</p>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_OUTCOMES.map((o) => {
                    const selected = form.outcome === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setField('outcome', o.value)}
                        aria-pressed={selected}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                          selected
                            ? cn(toneClasses(o.tone).pill, 'shadow-sm font-semibold')
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', toneClasses(o.tone).dot)} />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="call-follow-up">Next follow-up (optional)</label>
                <input
                  id="call-follow-up"
                  type="datetime-local"
                  value={form.followUp}
                  onChange={(e) => setField('followUp', e.target.value)}
                  className={inputBase}
                />
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="call-remarks">Remarks</label>
                <Textarea
                  id="call-remarks"
                  placeholder="What did the customer say? Any commitment or next step…"
                  value={form.remarks}
                  onChange={(e) => setField('remarks', e.target.value)}
                  className="min-h-[88px] rounded-lg border-slate-200 bg-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="call-recording">Call recording (optional)</label>
                <input
                  id="call-recording"
                  type="file"
                  accept={CALL_RECORDING_ACCEPT}
                  onChange={handleRecordingChange}
                  className="block w-full text-xs text-slate-600 file:mr-2 file:h-8 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
                {form.recording ? (
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-slate-500 truncate">{form.recording.name}</p>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                      onClick={() => setField('recording', null)}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
                {previewUrl ? <CallRecordingPlayer src={previewUrl} className="h-8 w-full" /> : null}
              </div>

              {formError ? <p className="text-xs font-semibold text-rose-600">{formError}</p> : null}
              {savedMessage ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {savedMessage}
                </p>
              ) : null}

              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                loading={saving}
                className="h-10 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <PhoneCall className="mr-2 h-4 w-4" />
                Save call log
              </Button>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Call history <span className="font-normal text-slate-500">({logs.length})</span>
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => loadLogs(true)}
                disabled={loading}
                className="h-7 px-2 text-xs text-slate-600"
              >
                <RefreshCw className={cn('mr-1 h-3.5 w-3.5', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>

            {loadError ? <p className="text-xs font-semibold text-rose-600">{loadError}</p> : null}

            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Spinner className="h-4 w-4" /> Loading call history…
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                <PhoneOff className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-700">No calls logged yet</p>
                <p className="text-xs text-slate-500">
                  {canAdd ? 'Log the first call using the form above.' : 'Calls logged by the team will appear here.'}
                </p>
              </div>
            ) : (
              <ol className="relative space-y-3 before:absolute before:left-[4px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {logs.map((log) => (
                  <CallLogCard key={log.id} log={log} />
                ))}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
