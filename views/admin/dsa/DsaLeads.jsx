import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from '@/lib/router';
import { dsaAPI, unwrapDsaResponse } from '@/lib/api/dsa';
import { PageLoader } from '@/components/ui/PageLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  RefreshCw,
  Plus,
  Search,
  FileText,
  UserPlus,
  Phone,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  new: 'bg-slate-100 text-slate-700 border-slate-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  docs_pending: 'bg-amber-50 text-amber-800 border-amber-200',
  converted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const APP_PHASE_COLORS = {
  draft: 'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
};

function FieldGroup({ label, required, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function DsaLeads() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [form, setForm] = useState({
    customer_mobile: '',
    customer_name: '',
    city: '',
    intended_amount: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef(null);

  useEffect(() => {
    const delay = search.trim() ? 350 : 0;
    const t = setTimeout(() => setDebouncedSearch(search.trim()), delay);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;
      if (!silent) setRefreshing(true);
      try {
        const res = await dsaAPI.listLeads({
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
        });
        const { ok, data } = unwrapDsaResponse(res);
        if (ok) {
          setLeads(data?.leads || []);
          setTotal(data?.pagination?.total ?? (data?.leads?.length || 0));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, statusFilter]
  );

  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    load({ silent: hasLoadedOnce.current });
    hasLoadedOnce.current = true;
  }, [load]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreate = async () => {
    const mobile = form.customer_mobile.replace(/\D/g, '');
    if (mobile.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await dsaAPI.createLead({
        ...form,
        customer_mobile: mobile,
        intended_amount: form.intended_amount ? Number(form.intended_amount) : null,
      });
      const { ok, message } = unwrapDsaResponse(res);
      if (ok) {
        setShowForm(false);
        setSearchParams({});
        setForm({
          customer_mobile: '',
          customer_name: '',
          city: '',
          intended_amount: '',
          notes: '',
        });
        showSuccess('Lead created successfully');
        await load({ silent: true });
      } else {
        setError(message || 'Could not create lead');
      }
    } catch (e) {
      setError(e.message || e.response?.data?.message || 'Could not create lead');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (leadId) => {
    try {
      const res = await dsaAPI.convertLead(leadId);
      const { ok, data, message } = unwrapDsaResponse(res);
      if (ok) {
        const fillRef = data?.application?.lead_id || data?.assistedToken;
        const fillUrl = data?.fillUrl || (fillRef ? `/admin/applications/fill/${encodeURIComponent(fillRef)}` : null);
        if (fillUrl) navigate(fillUrl);
        else {
          showSuccess('Lead converted');
          load({ silent: true });
        }
      } else {
        alert(message || 'Convert failed');
      }
    } catch (e) {
      alert(e.message || 'Convert failed');
    }
  };

  const renderAppAction = (l) => {
    if (l.status !== 'converted' || !l.loan_application_id) return null;

    const isDraft = !l.application_status || l.application_status === 'draft';

    const fillRef = l.lead_id || l.assisted_token;
    if (isDraft && fillRef) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg text-blue-700 border-blue-200 hover:bg-blue-50"
          onClick={() => navigate(`/admin/applications/fill/${encodeURIComponent(fillRef)}`)}
        >
          Continue application
        </Button>
      );
    }

    if (!isDraft) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg"
          onClick={() => navigate(`/admin/dsa/applications/${l.loan_application_id}/status`)}
        >
          View status
        </Button>
      );
    }

    if (fillRef) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg"
          onClick={() => navigate(`/admin/applications/fill/${encodeURIComponent(fillRef)}`)}
        >
          Continue application
        </Button>
      );
    }

    return (
      <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => handleConvert(l.id)}>
        Open fill
      </Button>
    );
  };

  if (initialLoading) return <PageLoader text="Loading leads…" />;

  return (
    <div className="space-y-8 pb-12 max-w-[1400px]">
      {/* Page header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">
            DSA Partner
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Lead management
          </h1>
          <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
            {total} lead{total === 1 ? '' : 's'} in your pipeline. Each lead is separate — convert,
            fill the application, then track status after submit.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            variant="outline"
            className="h-11 rounded-lg border-slate-200 px-5"
            onClick={() => navigate('/admin/dsa/applications')}
          >
            <FileText className="w-4 h-4 mr-2 text-slate-500" />
            Submitted applications
          </Button>
          <Button className="h-11 rounded-lg px-5 shadow-sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add lead
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Filters toolbar */}
      <div className="rounded-lg border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search mobile, name, code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 rounded-lg border-slate-200 bg-white focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="h-11 min-w-[160px] rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {['new', 'contacted', 'docs_pending', 'converted', 'rejected'].map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => load()}
              disabled={refreshing}
              className="h-11 rounded-lg px-4 gap-2 border-slate-200"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              {refreshing ? 'Updating…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden relative min-h-[240px]">
        {refreshing && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Spinner className="w-8 h-8" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                {['Code', 'Customer', 'City', 'Amount', 'Lead status', 'Application', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-800">{l.lead_code}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900 capitalize">
                      {l.customer_name || '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 tabular-nums">{l.customer_mobile}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 capitalize">{l.city || '—'}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900 tabular-nums">
                    {formatAmount(l.intended_amount)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant="outline"
                      className={cn('font-medium capitalize', STATUS_COLORS[l.status] || '')}
                    >
                      {l.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    {l.appDisplay ? (
                      <Badge
                        variant="outline"
                        className={cn('font-medium', APP_PHASE_COLORS[l.appDisplay.phase] || '')}
                      >
                        {l.appDisplay.title}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {l.status !== 'converted' && l.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg"
                          onClick={() => handleConvert(l.id)}
                        >
                          Convert
                        </Button>
                      )}
                      {renderAppAction(l)}
                    </div>
                  </td>
                </tr>
              ))}
              {!leads.length && !refreshing && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <UserPlus className="w-10 h-10 opacity-40" />
                      <p className="text-sm font-medium text-slate-600">
                        {debouncedSearch || statusFilter
                          ? 'No leads match your filters'
                          : 'No leads yet'}
                      </p>
                      <p className="text-xs max-w-sm">
                        {debouncedSearch || statusFilter
                          ? 'Try a different search or clear the status filter.'
                          : 'Create your first lead to start the application journey.'}
                      </p>
                      {!debouncedSearch && !statusFilter && (
                        <Button className="mt-2 rounded-lg" onClick={() => setShowForm(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add lead
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New lead dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setError('');
            setSearchParams({});
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-lg border-slate-200">
          <DialogHeader className="px-6 pt-6 pb-2 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">New lead</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Add customer details. You can convert and fill the loan application next.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 border-t border-slate-200 bg-slate-50/40">
            <FieldGroup label="Mobile number" required hint="10 digits">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  +91
                </span>
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                <Input
                  value={form.customer_mobile}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  placeholder="9876543210"
                  inputMode="numeric"
                  className="h-11 pl-12 pr-10 rounded-lg border-slate-200 bg-white"
                />
              </div>
            </FieldGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldGroup label="Customer name">
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Full name"
                  className="h-11 rounded-lg border-slate-200 bg-white"
                />
              </FieldGroup>
              <FieldGroup label="City">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                    className="h-11 pl-10 rounded-lg border-slate-200 bg-white"
                  />
                </div>
              </FieldGroup>
            </div>

            <FieldGroup label="Intended loan amount" hint="Optional">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  type="number"
                  min="0"
                  value={form.intended_amount}
                  onChange={(e) => setForm({ ...form, intended_amount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="h-11 pl-10 rounded-lg border-slate-200 bg-white"
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Notes" hint="Optional">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any notes about this lead…"
                rows={3}
                className="rounded-lg border-slate-200 bg-white resize-none min-h-[88px]"
              />
            </FieldGroup>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-5 border-t border-slate-200 bg-white flex-col-reverse sm:flex-row gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={saving}
              className="h-11 w-full sm:w-auto rounded-lg border-slate-200 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="h-11 w-full sm:flex-1 rounded-lg px-6 font-semibold"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="w-4 h-4" />
                  Creating lead…
                </span>
              ) : (
                'Create lead'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
