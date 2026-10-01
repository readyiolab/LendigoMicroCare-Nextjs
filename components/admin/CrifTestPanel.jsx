import { useState, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { adminAPI } from '@/lib/api/admin';

const FIELD_CLASS = 'h-8 text-xs rounded-lg border-slate-200 bg-white';
const LABEL_CLASS = 'block text-[10px] text-slate-500 uppercase tracking-wider mb-1';

function inr(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{value ?? '—'}</p>
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

function TradelinesTable({ tradelines }) {
  if (!Array.isArray(tradelines) || tradelines.length === 0) {
    return <p className="text-xs text-slate-500">No tradelines in the report.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 font-medium">Lender</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right">Sanctioned</th>
            <th className="px-3 py-2 font-medium text-right">Balance</th>
            <th className="px-3 py-2 font-medium text-right">DPD</th>
            <th className="px-3 py-2 font-medium">Secured</th>
            <th className="px-3 py-2 font-medium">Open date</th>
          </tr>
        </thead>
        <tbody>
          {tradelines.map((t, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="px-3 py-2 text-slate-700 max-w-[140px] truncate">{t.credit_guarantor || '—'}</td>
              <td className="px-3 py-2 text-slate-900">{t.account_type || '—'}</td>
              <td className="px-3 py-2">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0.5 normal-case ${
                    t.status === 'active' ? 'text-emerald-700 border-emerald-300' : 'text-slate-500'
                  }`}
                >
                  {t.status || '—'}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{inr(t.sanctioned_amount)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{inr(t.current_balance)}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${t.dpd > 0 ? 'text-rose-600 font-medium' : ''}`}>
                {t.dpd ?? '—'}
              </td>
              <td className="px-3 py-2">{t.secured ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 tabular-nums">
                {t.open_date ? String(t.open_date).slice(0, 10) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InquiryTable({ history }) {
  const rows = Array.isArray(history) ? history : [];
  if (!rows.length) return <p className="text-xs text-slate-500">No inquiries found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 font-medium">Lender</th>
            <th className="px-3 py-2 font-medium">Purpose</th>
            <th className="px-3 py-2 font-medium text-right">Amount</th>
            <th className="px-3 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 text-slate-900">{h.member_name || '—'}</td>
              <td className="px-3 py-2 text-slate-700">{h.purpose || '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{inr(h.amount)}</td>
              <td className="px-3 py-2 tabular-nums">{h.inquiry_date || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreTrend({ trends }) {
  if (!trends?.dates || !trends?.values) return null;
  const dates = String(trends.dates).split('|').filter(Boolean);
  const values = String(trends.values).split('|').filter(Boolean);
  if (!dates.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {dates.map((d, i) => (
        <div key={d} className="text-center rounded-lg border border-slate-200 px-2 py-1.5 bg-white min-w-[60px]">
          <p className="text-[9px] text-slate-500">{d.slice(3)}</p>
          <p className="text-xs font-bold text-slate-900 tabular-nums">{values[i] || '—'}</p>
        </div>
      ))}
    </div>
  );
}

function VariationList({ items }) {
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return <p className="text-xs text-slate-500">—</p>;
  return (
    <ul className="space-y-0.5">
      {arr.map((v, i) => (
        <li key={i} className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-800">{v.value || '—'}</span>
          {v.reported_date && (
            <span className="text-slate-400 text-[10px]">({v.reported_date})</span>
          )}
        </li>
      ))}
    </ul>
  );
}

const DEFAULT_FORM = {
  mobile_no: '',
  prefill_lookup: '0',
  first_name: '',
  last_name: '',
  pan: '',
  date_of_birth: '',
  gender: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  userId: '',
};

export default function CrifTestPanel() {
  const [lookupMobile, setLookupMobile] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [form, setForm] = useState(DEFAULT_FORM);
  const [pullLoading, setPullLoading] = useState(false);
  const [pullError, setPullError] = useState('');
  const [result, setResult] = useState(null);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleLookup = useCallback(async () => {
    const mobile = lookupMobile.trim().replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setLookupError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await adminAPI.crifTestLookup(mobile);
      if (res?.status === 1 && res.data) {
        const d = res.data;
        setForm({
          mobile_no: d.mobile_no || mobile,
          prefill_lookup: '0',
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          pan: d.pan || '',
          date_of_birth: d.date_of_birth || '',
          gender: d.gender || '',
          email: d.email || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          pincode: d.pincode || '',
          userId: String(d.userId || ''),
        });
        setResult(null);
        setPullError('');
      } else {
        setLookupError(res?.message || 'Customer not found');
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || err.message || 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  }, [lookupMobile]);

  const handlePull = useCallback(async () => {
    setPullLoading(true);
    setPullError('');
    setResult(null);
    try {
      const payload = { ...form };
      const res = await adminAPI.crifTestPull(payload);
      if (res?.status === 1) {
        setResult(res.data);
      } else {
        setPullError(res?.message || 'CRIF pull failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'CRIF pull failed';
      const code = err.response?.data?.code || '';
      setPullError(code ? `[${code}] ${msg}` : msg);
    } finally {
      setPullLoading(false);
    }
  }, [form]);

  const rc = result?.rawCreditReport;
  const identity = rc?.customer_identity;
  const infoVariations = rc?.personal_info_variation;
  const inquiryHistory = rc?.inquiry_history?.history;
  const trends = rc?.trends;
  const scores = rc?.scores;

  return (
    <div className="space-y-5 py-2">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-widest">
            CRIF Live Test
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Look up a customer by mobile, edit any field, then pull a live Digitap Credit Analytics report.
            Results are saved to the database.
          </p>
        </div>
      </div>

      {/* Mobile Lookup */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          Step 1 — Look up customer
        </p>
        <div className="flex gap-2">
          <Input
            className={`${FIELD_CLASS} flex-1 max-w-xs`}
            placeholder="Enter 10-digit mobile number"
            value={lookupMobile}
            onChange={(e) => {
              setLookupMobile(e.target.value);
              setLookupError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs rounded-lg"
            disabled={lookupLoading}
            onClick={handleLookup}
          >
            {lookupLoading ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <Search className="w-3.5 h-3.5 mr-1.5" />
            )}
            Look up
          </Button>
        </div>
        {lookupError && (
          <p className="text-[11px] text-rose-600">{lookupError}</p>
        )}
        {form.pan && !lookupError && (
          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Customer found — fields auto-filled below. Edit if needed.
          </p>
        )}
      </div>

      {/* Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          Step 2 — Verify / edit details
        </p>

        <p className="text-[10px] text-slate-500">
          Uses Digitap CRIF v1.1: <code className="text-[10px]">/credit_analytics/v2/cf</code>,{' '}
          <code className="text-[10px]">prefill_lookup=0</code>, no OTP. DOB may be YYYY-MM-DD in this form
          (backend converts to DD-MM-YYYY).
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className={LABEL_CLASS}>First name *</label>
            <Input
              className={FIELD_CLASS}
              value={form.first_name}
              onChange={(e) => setField('first_name', e.target.value)}
              placeholder="First name"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Last name *</label>
            <Input
              className={FIELD_CLASS}
              value={form.last_name}
              onChange={(e) => setField('last_name', e.target.value)}
              placeholder="Last name"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Mobile *</label>
            <Input
              className={FIELD_CLASS}
              value={form.mobile_no}
              onChange={(e) => setField('mobile_no', e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>PAN *</label>
            <Input
              className={`${FIELD_CLASS} uppercase`}
              value={form.pan}
              onChange={(e) => setField('pan', e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Date of birth * (YYYY-MM-DD)</label>
            <Input
              className={FIELD_CLASS}
              value={form.date_of_birth}
              onChange={(e) => setField('date_of_birth', e.target.value)}
              placeholder="2001-09-19"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Gender *</label>
            <select
              className={`w-full ${FIELD_CLASS} px-3`}
              value={form.gender}
              onChange={(e) => setField('gender', e.target.value)}
            >
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="male">male</option>
              <option value="female">female</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className={LABEL_CLASS}>Email *</label>
            <Input
              className={FIELD_CLASS}
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <label className={LABEL_CLASS}>Address *</label>
            <Input
              className={FIELD_CLASS}
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Full address"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>City *</label>
            <Input
              className={FIELD_CLASS}
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              placeholder="City"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>State *</label>
            <Input
              className={FIELD_CLASS}
              value={form.state}
              onChange={(e) => setField('state', e.target.value)}
              placeholder="State"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Pincode *</label>
            <Input
              className={FIELD_CLASS}
              value={form.pincode}
              onChange={(e) => setField('pincode', e.target.value)}
              placeholder="560037"
            />
          </div>
        </div>

        <div className="pt-1">
          <Button
            className="h-9 text-xs rounded-lg px-5 bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={pullLoading}
            onClick={handlePull}
          >
            {pullLoading ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 mr-2" />
            )}
            {pullLoading ? 'Pulling live CRIF…' : 'Run live CRIF pull'}
          </Button>
          <p className="text-[10px] text-slate-400 mt-1.5">
            This will make a billable call to Digitap and save the result to the database.
          </p>
        </div>
      </div>

      {/* Error */}
      {pullError && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5" />
          <AlertDescription className="text-xs ml-1">{pullError}</AlertDescription>
        </Alert>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Score hero */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-indigo-50">
                  <span className="text-lg font-bold text-indigo-700 tabular-nums">
                    {result.score ?? '—'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">CRIF Score</p>
                  {scores?.score_type && (
                    <p className="text-[10px] text-slate-400">{scores.score_type}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-2">
                <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-none">
                  Result code: {result.resultCode ?? '—'}
                </Badge>
                {result.clientRefNum && (
                  <Badge variant="outline" className="text-[10px] normal-case font-mono">
                    {result.clientRefNum}
                  </Badge>
                )}
                {result.savedReportId && (
                  <Badge variant="outline" className="text-[10px] normal-case">
                    DB ID #{result.savedReportId}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total accounts" value={result.totalAccounts} />
            <StatCard label="Active accounts" value={result.activeAccounts} />
            <StatCard label="Closed accounts" value={result.closedAccounts} />
            <StatCard label="Overdue accounts" value={result.overdueAccounts} />
            <StatCard label="Inquiries (6m)" value={result.inquiries6m} />
            <StatCard label="Inquiries (12m)" value={result.inquiries12m} />
            <StatCard label="Days past due" value={result.daysPastDue} />
            <StatCard label="Total overdue" value={inr(result.totalOverdue)} />
          </div>

          {/* Customer identity */}
          {identity && (
            <CollapsibleSection title="Customer identity (from CRIF)" defaultOpen>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-[11px]">
                {[
                  ['Name', identity.name],
                  ['Date of birth', identity.dob],
                  ['PAN', identity.pan],
                  ['Phone', identity.phone],
                  ['Email', identity.email],
                  ['Address', identity.address],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-slate-400">{label}: </span>
                    <span className="text-slate-800 font-medium">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Tradelines */}
          <CollapsibleSection title={`Tradelines (${result.tradelines?.length ?? 0})`} defaultOpen>
            <TradelinesTable tradelines={result.tradelines} />
          </CollapsibleSection>

          {/* Inquiry history */}
          {inquiryHistory && (
            <CollapsibleSection title={`Inquiry history (${inquiryHistory.length})`} defaultOpen>
              <InquiryTable history={inquiryHistory} />
            </CollapsibleSection>
          )}

          {/* Score trend */}
          {trends && (
            <CollapsibleSection title="Score trend history">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] text-slate-500">{trends.reserved1 || 'Score history'}</span>
              </div>
              <ScoreTrend trends={trends} />
            </CollapsibleSection>
          )}

          {/* Personal info variations */}
          {infoVariations && (
            <CollapsibleSection title="Personal info variations">
              <div className="space-y-3">
                {[
                  ['Name variations', infoVariations.name_variations?.variation],
                  ['DOB variations', infoVariations.date_of_birth_variations?.variation],
                  ['Phone variations', infoVariations.phone_number_variations?.variation],
                  ['Address variations', infoVariations.address_variations?.variation],
                ].map(([label, items]) =>
                  Array.isArray(items) && items.length > 0 ? (
                    <div key={label}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                      <VariationList items={items} />
                    </div>
                  ) : null
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Raw JSON */}
          <CollapsibleSection title="Raw vendor response (JSON)">
            <pre className="text-[10px] text-slate-700 bg-slate-50 rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap break-words">
              {JSON.stringify(result.rawVendorResponse, null, 2)}
            </pre>
          </CollapsibleSection>

          {/* Re-run */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-lg"
              onClick={() => {
                setResult(null);
                setPullError('');
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Clear result / run again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
