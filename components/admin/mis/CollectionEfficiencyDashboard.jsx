import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const VIEWS_KEY = 'lendigo.ceDashboard.views';
const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'next_7', label: 'Next 7 days' },
  { id: 'next_15', label: 'Next 15 days' },
  { id: 'next_30', label: 'Next 30 days' },
  { id: 'custom', label: 'Custom' },
];
const STATUSES = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'due_today', label: 'Due today' },
  { id: 'paid', label: 'Paid' },
  { id: 'partially_paid', label: 'Partially paid' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'defaulted', label: 'Defaulted' },
];
const GROUPS = [
  ['efficiency', 'Collection efficiency'],
  ['dues', 'Due dates'],
  ['overdue', 'Overdue'],
  ['bounce', 'Bounces'],
  ['ptp', 'Promise to pay'],
  ['agent', 'Agents and follow-up'],
  ['behavior', 'Repayment behavior'],
  ['forecast', 'Forecast'],
];
const TONE = {
  on_track: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  at_risk: 'bg-amber-50 text-amber-800 border-amber-200',
  overdue: 'bg-orange-50 text-orange-800 border-orange-200',
  critical: 'bg-red-50 text-red-800 border-red-200',
};
const TONE_LABEL = { on_track: 'On track', at_risk: 'At risk', overdue: 'Overdue', critical: 'Critical' };
const STATUS_LABEL = Object.fromEntries(STATUSES.map((row) => [row.id, row.label]));
const DRILL = {
  dueToday: { status: 'due_today', preset: 'today' },
  dueTodayCount: { status: 'due_today', preset: 'today' },
  overdueAmount: { status: 'overdue', preset: 'overdue' },
  overdueInstallments: { status: 'overdue', preset: 'overdue' },
  partialRate: { status: 'partially_paid' },
  emiRate: { status: 'paid' },
  upcoming: { status: 'upcoming' },
  upcomingCount: { status: 'upcoming' },
};

function todayIst() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

function emptyFilters() {
  return {
    asOnDate: todayIst(),
    preset: 'this_month',
    fromDate: '',
    toDate: '',
    status: '',
    search: '',
    loanType: '',
    tenureBand: '',
    state: '',
    agentId: '',
    dpdBucket: '',
    paymentMode: '',
    timing: '',
    grain: 'month',
    horizonDays: '7',
    outstandingMin: '',
    outstandingMax: '',
    overdueMin: '',
    overdueMax: '',
    sort: 'dueDate',
    sortDir: 'asc',
    page: 1,
  };
}

function numericParam(value) {
  return /^\d+(\.\d+)?$/.test(String(value || '')) ? value : '';
}

function toParams(filters) {
  const params = {
    as_on_date: filters.asOnDate,
    preset: filters.preset,
    from_date: filters.preset === 'custom' ? filters.fromDate : '',
    to_date: filters.preset === 'custom' ? filters.toDate : '',
    status: filters.status,
    search: filters.search.trim(),
    loan_type: filters.loanType,
    tenure_band: filters.tenureBand,
    state: filters.state,
    agent_id: filters.agentId,
    dpd_bucket: filters.dpdBucket,
    payment_mode: filters.paymentMode,
    timing: filters.timing,
    grain: filters.grain,
    horizon_days: filters.horizonDays,
    outstanding_min: numericParam(filters.outstandingMin),
    outstanding_max: numericParam(filters.outstandingMax),
    overdue_min: numericParam(filters.overdueMin),
    overdue_max: numericParam(filters.overdueMax),
    sort: filters.sort,
    sort_dir: filters.sortDir,
    page: filters.page,
    page_size: 25,
  };
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] == null) delete params[key];
  });
  return params;
}

const inr = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function showValue(card) {
  if (card.value == null) return 'N/A';
  if (card.unit === 'amount') return `₹${inr(card.value)}`;
  if (card.unit === 'percent') return `${Number(card.value).toFixed(1)}%`;
  if (card.unit === 'days') return `${Number(card.value).toFixed(1)} days`;
  return inr(card.value);
}

function showDelta(card) {
  if (card.delta == null) return null;
  const sign = card.delta > 0 ? '+' : '';
  if (card.unit === 'amount') return `${sign}₹${inr(card.delta)} vs prior`;
  if (card.unit === 'percent') return `${sign}${Number(card.delta).toFixed(1)} pp vs prior`;
  if (card.unit === 'days') return `${sign}${Number(card.delta).toFixed(1)} days vs prior`;
  return `${sign}${inr(card.delta)} vs prior`;
}

function displayDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && y ? `${d}-${m}-${y}` : iso;
}

function readViews() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function SelectBox({ label, value, onChange, children }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
        {children}
      </select>
    </label>
  );
}

export default function CollectionEfficiencyDashboard() {
  const [filters, setFilters] = useState(emptyFilters);
  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [views, setViews] = useState([]);
  const [viewName, setViewName] = useState('');

  useEffect(() => { setViews(readViews()); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => (prev.search === searchText ? prev : { ...prev, search: searchText, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getCollectionDashboard(toParams(filters));
      if (res.status !== 1) throw new Error(res.message || 'Failed to load the collection dashboard');
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load the collection dashboard');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const patch = (partial) => setFilters((prev) => ({ ...prev, ...partial, page: partial.page || 1 }));

  const choosePreset = (preset) => {
    setFilters((prev) => ({
      ...prev,
      preset,
      page: 1,
      fromDate: preset === 'custom' ? (prev.fromDate || data?.rules?.periodFrom || '') : '',
      toDate: preset === 'custom' ? (prev.toDate || data?.rules?.periodTo || '') : '',
    }));
  };

  const drill = (id) => {
    const next = DRILL[id];
    if (!next) return;
    patch(next);
    document.getElementById('ce-installments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sortBy = (key) => {
    setFilters((prev) => ({
      ...prev,
      sort: key,
      sortDir: prev.sort === key && prev.sortDir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const next = [...views.filter((row) => row.name !== name), { name, filters: { ...filters, page: 1 } }];
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    setViews(next);
    setViewName('');
  };

  const deleteView = (name) => {
    const next = views.filter((row) => row.name !== name);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    setViews(next);
  };

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const res = await adminAPI.exportCollectionDashboard(toParams(filters));
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Collection_Dashboard_${filters.asOnDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const kpis = data?.kpis || [];
  const byGroup = (id) => kpis.filter((row) => row.group === id);
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };
  const rules = data?.rules;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">A closer look</h2>
          <p className="text-sm text-slate-500 mt-1">
            The four numbers above are the ones to use day to day. This section splits the same loans by date, agent, and how late they are.
          </p>
        </div>
        <Button type="button" variant="outline" className="h-10 px-4 text-sm border-slate-200" onClick={download} disabled={downloading}>
          {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Export installments
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => choosePreset(preset.id)}
              className={cn('h-8 px-3 rounded-full text-sm border', filters.preset === preset.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200')}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700">As-on date</span>
            <Input type="date" value={filters.asOnDate} onChange={(e) => patch({ asOnDate: e.target.value })} className="h-10" />
          </label>
          {filters.preset === 'custom' && (
            <>
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-slate-700">Due from</span>
                <Input type="date" value={filters.fromDate} onChange={(e) => patch({ fromDate: e.target.value })} className="h-10" />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-slate-700">Due to</span>
                <Input type="date" value={filters.toDate} onChange={(e) => patch({ toDate: e.target.value })} className="h-10" />
              </label>
            </>
          )}
          <label className="space-y-1.5 block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Search customer, loan or code</span>
            <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Name, LAN, customer code" className="h-10" />
          </label>
          <SelectBox label="Repayment status" value={filters.status} onChange={(status) => patch({ status })}>
            <option value="">All</option>
            {STATUSES.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
          </SelectBox>
          <SelectBox label="Loan type" value={filters.loanType} onChange={(loanType) => patch({ loanType })}>
            <option value="">All</option>
            <option value="Fresh">Fresh</option>
            <option value="Repeat">Repeat</option>
          </SelectBox>
          <SelectBox label="Tenure" value={filters.tenureBand} onChange={(tenureBand) => patch({ tenureBand })}>
            <option value="">All</option>
            <option value="up-to-30">Up to 30 days</option>
            <option value="31-60">31–60 days</option>
            <option value="61-90">61–90 days</option>
            <option value="91-plus">91+ days</option>
          </SelectBox>
          <SelectBox label="DPD bucket" value={filters.dpdBucket} onChange={(dpdBucket) => patch({ dpdBucket })}>
            <option value="">All</option>
            <option value="1-30">1–30</option>
            <option value="31-60">31–60</option>
            <option value="61-90">61–90</option>
            <option value="90+">90+</option>
          </SelectBox>
          <SelectBox label="State" value={filters.state} onChange={(state) => patch({ state })}>
            <option value="">All</option>
            {(data?.options?.states || []).map((state) => <option key={state} value={state}>{state}</option>)}
          </SelectBox>
          <SelectBox label="Collection agent" value={filters.agentId} onChange={(agentId) => patch({ agentId })}>
            <option value="">All</option>
            {(data?.options?.agents || []).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </SelectBox>
          <SelectBox label="Payment mode" value={filters.paymentMode} onChange={(paymentMode) => patch({ paymentMode })}>
            <option value="">All</option>
            {(data?.options?.paymentModes || []).map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </SelectBox>
          <SelectBox label="Collected versus due" value={filters.timing} onChange={(timing) => patch({ timing })}>
            <option value="">All</option>
            <option value="before">Before due date</option>
            <option value="on">On due date</option>
            <option value="after">After due date</option>
          </SelectBox>
          <SelectBox label="Trend" value={filters.grain} onChange={(grain) => patch({ grain, page: filters.page })}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
          </SelectBox>
          <SelectBox label="Forecast horizon" value={filters.horizonDays} onChange={(horizonDays) => patch({ horizonDays })}>
            <option value="7">7 days</option>
            <option value="15">15 days</option>
            <option value="30">30 days</option>
          </SelectBox>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700">Outstanding min</span>
            <Input value={filters.outstandingMin} onChange={(e) => patch({ outstandingMin: e.target.value })} className="h-10" />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700">Outstanding max</span>
            <Input value={filters.outstandingMax} onChange={(e) => patch({ outstandingMax: e.target.value })} className="h-10" />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700">Overdue min</span>
            <Input value={filters.overdueMin} onChange={(e) => patch({ overdueMin: e.target.value })} className="h-10" />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700">Overdue max</span>
            <Input value={filters.overdueMax} onChange={(e) => patch({ overdueMax: e.target.value })} className="h-10" />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700">Save this view</span>
            <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="View name" className="h-10 w-48" />
          </label>
          <Button type="button" variant="outline" className="h-10 border-slate-200" onClick={saveView}>Save view</Button>
          {views.map((view) => (
            <span key={view.name} className="inline-flex items-center h-10 rounded-md border border-slate-200 overflow-hidden">
              <button type="button" className="px-3 text-sm text-slate-700" onClick={() => { setFilters({ ...emptyFilters(), ...view.filters, page: 1 }); setSearchText(view.filters.search || ''); }}>
                {view.name}
              </button>
              <button type="button" className="px-2 text-slate-400" onClick={() => deleteView(view.name)} aria-label={`Delete ${view.name}`}>×</button>
            </span>
          ))}
        </div>
        {rules && (
          <p className="text-xs text-slate-500">
            Period {displayDate(rules.periodFrom)} to {displayDate(rules.periodTo)}
            {rules.previousFrom ? `, compared with ${displayDate(rules.previousFrom)} to ${displayDate(rules.previousTo)}` : ''}. {rules.timezone}. Grace period {rules.gracePeriodDays} days.
            {rules.generatedAt ? ` Data as of ${rules.generatedAt}.` : ''}
          </p>
        )}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : data && (
        <>
          {GROUPS.map(([id, title]) => (
            <section key={id} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {byGroup(id).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => drill(card.id)}
                    title={card.naReason || card.formula}
                    className={cn('text-left rounded-lg border border-slate-200 bg-white px-4 py-3', DRILL[card.id] && 'hover:border-slate-400')}
                  >
                    <p className="text-[12px] text-slate-500">{card.label}</p>
                    <p className="text-lg font-semibold font-mono mt-0.5 text-slate-900">{showValue(card)}</p>
                    {card.naReason && <p className="text-[11px] text-slate-400 mt-1">{card.naReason}</p>}
                    {showDelta(card) && <p className="text-[11px] text-slate-500 mt-1">{showDelta(card)}</p>}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <summary className="text-sm font-semibold text-slate-700 cursor-pointer">Metrics with no source data</summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {byGroup('unavailable').map((card) => (
                <div key={card.id} className="rounded-md border border-slate-100 px-3 py-2">
                  <p className="text-sm text-slate-700">{card.label}</p>
                  <p className="text-[12px] text-slate-500 mt-1">{card.naReason}</p>
                </div>
              ))}
            </div>
          </details>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Scheduled versus collected">
              <TrendChart rows={data.trend || []} />
            </ChartCard>
            <ChartCard title="Overdue amount by DPD">
              <SimpleBar rows={data.dpdExposure || []} x="label" bars={[{ key: 'amount', name: 'Unpaid', fill: '#dc2626' }]} />
            </ChartCard>
            <ChartCard title="Efficiency by agent">
              <SimpleBar rows={data.byAgent || []} x="label" bars={[{ key: 'efficiency', name: 'Efficiency %', fill: '#059669' }]} />
            </ChartCard>
            <ChartCard title="Efficiency by loan type">
              <SimpleBar rows={data.byLoanType || []} x="label" bars={[{ key: 'efficiency', name: 'Efficiency %', fill: '#0f766e' }]} />
            </ChartCard>
            <ChartCard title="Upcoming dues and expected collections">
              <SimpleBar
                rows={(data.forecast?.horizons || []).map((row) => ({ ...row, label: `${row.days} days` }))}
                x="label"
                bars={[{ key: 'unpaid', name: 'Unpaid', fill: '#94a3b8' }, { key: 'expected', name: 'Expected', fill: '#059669' }]}
              />
            </ChartCard>
            <ChartCard title="Bounces and promise to pay">
              <SimpleBar
                rows={[
                  { label: 'Failed attempts', count: data.bounce?.failed || 0 },
                  { label: 'Settled attempts', count: data.bounce?.success || 0 },
                  { label: 'PTP kept', count: data.ptp?.kept || 0 },
                  { label: 'PTP broken', count: data.ptp?.broken || 0 },
                ]}
                x="label"
                bars={[{ key: 'count', name: 'Count', fill: '#334155' }]}
              />
            </ChartCard>
          </div>
          {data.forecast?.assumption && <p className="text-xs text-slate-500">{data.forecast.assumption}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QueueCard title="Due today" rows={data.queues?.dueToday} onOpen={(row) => { setSearchText(row.loanAccount || ''); }} />
            <QueueCard title="Due in the next 7 days" rows={data.queues?.dueNext7} onOpen={(row) => { setSearchText(row.loanAccount || ''); }} />
            <QueueCard title="Critical overdue" rows={data.queues?.critical} onOpen={(row) => { setSearchText(row.loanAccount || ''); }} />
            <QueueCard title="Likely to miss a payment" rows={data.queues?.highRisk} onOpen={(row) => { setSearchText(row.loanAccount || ''); }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <p className="px-4 py-2.5 text-sm font-semibold text-slate-800 border-b bg-slate-50">Broken promises</p>
              <QueueLines rows={(data.queues?.brokenPtp || []).map((row) => ({ loanAccount: row.loanAccount, customerName: row.customerName, detail: `${displayDate(row.promiseDate)} · ₹${inr(row.promiseAmount)}` }))} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <p className="px-4 py-2.5 text-sm font-semibold text-slate-800 border-b bg-slate-50">Pending follow-ups by agent</p>
              {(data.queues?.agentFollowUps || []).length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">No pending follow-ups.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.queues.agentFollowUps.map((row) => (
                    <li key={row.agentName} className="px-4 py-2 text-sm flex justify-between"><span>{row.agentName}</span><span className="font-mono">{row.pending}</span></li>
                  ))}
                </ul>
              )}
              <p className="px-4 py-2 text-[12px] text-slate-500 border-t">
                Reminders sent: {data.reminders?.beforeDue || 0} before due, {data.reminders?.dueDate || 0} on the due date, {data.reminders?.afterMiss || 0} after a miss.
              </p>
            </div>
          </div>

          <div id="ce-installments" className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <div className="px-4 py-2.5 border-b bg-slate-50 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">Installments</p>
              <p className="text-[12px] text-slate-500">
                {meta.total} rows · scheduled ₹{inr(meta.scheduled)} · collected ₹{inr(meta.collected)} · outstanding ₹{inr(meta.outstanding)}
              </p>
            </div>
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-[12px] text-slate-500 border-b">
                  {[
                    ['customerName', 'Customer'],
                    ['loanAccount', 'Loan A/C'],
                    ['agentName', 'Agent'],
                    ['dueDate', 'Due date'],
                    ['emiAmount', 'EMI'],
                    ['outstanding', 'Outstanding'],
                    ['overdueAmount', 'Overdue'],
                    ['dpd', 'DPD'],
                    ['status', 'Status'],
                  ].map(([key, label]) => (
                    <th key={key} className="px-3 py-2">
                      <button type="button" className="font-medium" onClick={() => sortBy(key)}>{label}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.records || []).length === 0 ? (
                  <tr><td className="px-3 py-6 text-slate-500" colSpan={9}>No installments match these filters.</td></tr>
                ) : data.records.map((row) => (
                  <tr key={`${row.loanId}-${row.repaymentId}`} className="border-b border-slate-100">
                    <td className="px-3 py-2">{row.customerName || '—'}<div className="text-[11px] text-slate-400">{row.customerCode}</div></td>
                    <td className="px-3 py-2 font-mono text-[12px]">{row.loanAccount || '—'}</td>
                    <td className="px-3 py-2">{row.agentName || '—'}</td>
                    <td className="px-3 py-2">{displayDate(row.dueDate)}<div className="text-[11px] text-slate-400">Next {displayDate(row.nextDueDate)}</div></td>
                    <td className="px-3 py-2 text-right font-mono">{inr(row.emiAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono">{inr(row.outstanding)}</td>
                    <td className="px-3 py-2 text-right font-mono">{inr(row.overdueAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.dpd}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px]', TONE[row.tone] || TONE.on_track)}>
                        {TONE_LABEL[row.tone] || row.tone} · {STATUS_LABEL[row.status] || row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.total > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Page {meta.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-8 px-3 text-sm border-slate-200" disabled={loading || meta.page <= 1} onClick={() => patch({ page: meta.page - 1 })}>Previous</Button>
                <Button type="button" variant="outline" className="h-8 px-3 text-sm border-slate-200" disabled={loading || meta.page >= meta.totalPages} onClick={() => patch({ page: meta.page + 1 })}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800 mb-3">{title}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

function TrendChart({ rows }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No dues in this period.</p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="scheduled" name="Scheduled" fill="#94a3b8" />
        <Bar dataKey="collected" name="Collected" fill="#059669" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SimpleBar({ rows, x, bars }) {
  if (!rows.length) return <p className="text-sm text-slate-500">Nothing to chart for these filters.</p>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={x} tick={{ fontSize: 11 }} interval={0} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        {bars.map((bar) => <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.fill} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

function QueueCard({ title, rows, onOpen }) {
  const lines = (rows || []).map((row) => ({
    loanAccount: row.loanAccount,
    customerName: row.customerName,
    detail: `Due ${displayDate(row.dueDate)} · EMI ₹${inr(row.emiAmount)} · outstanding ₹${inr(row.outstanding)} · overdue ₹${inr(row.overdueAmount)}`,
  }));
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <p className="px-4 py-2.5 text-sm font-semibold text-slate-800 border-b bg-slate-50">{title}</p>
      <QueueLines rows={lines} onOpen={onOpen} source={rows || []} />
    </div>
  );
}

function QueueLines({ rows, onOpen, source }) {
  if (!rows.length) return <p className="px-4 py-6 text-sm text-slate-500">None for the current filters.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row, index) => (
        <li key={`${row.loanAccount}-${index}`}>
          <button type="button" className="w-full text-left px-4 py-2 hover:bg-slate-50" onClick={() => onOpen && onOpen(source ? source[index] : row)}>
            <span className="text-sm text-slate-800">{row.customerName || '—'} · {row.loanAccount || '—'}</span>
            <span className="block text-[12px] text-slate-500">{row.detail}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
