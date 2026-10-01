import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from '@/lib/router';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Clock, 
  CheckCircle, Download, Wallet, Activity, Percent, 
  MapPin, FileText, Shield, Check, Calendar, Filter, X, Search,
  ArrowRight, IndianRupee, PieChart as PieIcon, AlertTriangle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, subMonths } from 'date-fns';
import { loanAPI } from '@/lib/api/loan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/PageLoader';
import { applicationDetailPath } from '@/utils/applicationRef';
import { customerLoanRef } from '@/utils/loanIdentity';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

const DATE_PRESETS = [
  { label: 'Today', getValue: () => ({ startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 7 Days', getValue: () => ({ startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'This Month', getValue: () => ({ startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Last Month', getValue: () => { const d = subMonths(new Date(), 1); return { startDate: format(startOfMonth(d), 'yyyy-MM-dd'), endDate: format(endOfMonth(d), 'yyyy-MM-dd') }; } },
  { label: 'Last 30 Days', getValue: () => ({ startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }) },
];

export default function AdminOperationsAnalytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'portfolio' ? 'portfolio' : 'overview';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState('Last 30 Days');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    status: '', state: '', amountMin: '', amountMax: ''
  });

  // Portfolio View State
  const [activeTab, setActiveTab] = useState(initialTab); // 'overview' | 'portfolio'

  const switchTab = (tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'portfolio') next.set('tab', 'portfolio');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'portfolio' ? 'portfolio' : 'overview');
  }, [searchParams]);
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioSearchInput, setPortfolioSearchInput] = useState('');
  const [portfolioFilters, setPortfolioFilters] = useState({
    search: '',
    status: '',
    dpdBucket: '',
    minAmount: '',
    maxAmount: '',
    page: 1,
    limit: 10
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const search = portfolioSearchInput.trim();
      setPortfolioFilters((prev) => {
        if (prev.search === search && prev.page === 1) return prev;
        return { ...prev, search, page: 1 };
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [portfolioSearchInput]);

  const analyticsQueryKey = useMemo(() => {
    const q = { startDate: dateRange.startDate, endDate: dateRange.endDate };
    if (advancedFilters.status) q.status = advancedFilters.status;
    if (advancedFilters.state) q.state = advancedFilters.state;
    if (advancedFilters.amountMin) q.amountMin = advancedFilters.amountMin;
    if (advancedFilters.amountMax) q.amountMax = advancedFilters.amountMax;
    return JSON.stringify(q);
  }, [
    dateRange.startDate,
    dateRange.endDate,
    advancedFilters.status,
    advancedFilters.state,
    advancedFilters.amountMin,
    advancedFilters.amountMax,
  ]);

  const portfolioQueryKey = useMemo(
    () =>
      JSON.stringify({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...portfolioFilters,
      }),
    [dateRange, portfolioFilters]
  );

  const analyticsAbortRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'overview') return undefined;

    analyticsAbortRef.current?.abort();
    const controller = new AbortController();
    analyticsAbortRef.current = controller;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = JSON.parse(analyticsQueryKey);
        const response = await loanAPI.getOperationsAnalytics(params, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted && response?.data) setData(response.data);
      } catch (err) {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err.message || 'Failed to load data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeTab, analyticsQueryKey]);

  const portfolioAbortRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'portfolio') return undefined;

    portfolioAbortRef.current?.abort();
    const controller = new AbortController();
    portfolioAbortRef.current = controller;

    (async () => {
      setPortfolioLoading(true);
      try {
        const params = JSON.parse(portfolioQueryKey);
        const response = await loanAPI.getPortfolioSnapshot(params, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted && response?.data) setPortfolioData(response.data);
      } catch (err) {
        if (!controller.signal.aborted && err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') {
          console.error('Failed to fetch portfolio:', err);
        }
      } finally {
        if (!controller.signal.aborted) setPortfolioLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeTab, portfolioQueryKey]);

  const handleExportCSV = async () => {
    try {
      const params = { 
        ...dateRange,
        ...portfolioFilters
      };
      const response = await loanAPI.exportPortfolioCSV(params);
      const data = response.data || response;
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `portfolio_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export CSV');
    }
  };

  const stats = data?.metrics || {};

  const MetricCard = ({ title, value, subtitle, trend, highlight }) => (
    <div
      className={`relative overflow-hidden border rounded-lg p-5 shadow-sm transition-all ${
        highlight
          ? 'bg-slate-900 text-white border-slate-900 shadow-slate-300/40'
          : 'bg-white border-slate-200'
      }`}
    >
      <p
        className={`text-xs font-medium mb-1 ${
          highlight ? 'text-slate-300' : 'text-slate-500'
        }`}
      >
        {title}
      </p>
      {loading ? (
        <div className={`h-8 w-24 rounded-lg animate-pulse mb-2 ${highlight ? 'bg-slate-700' : 'bg-slate-200'}`} />
      ) : (
        <h3
          className={`text-2xl font-semibold tracking-tight tabular-nums ${
            highlight ? 'text-white' : 'text-slate-900'
          }`}
        >
          {value}
        </h3>
      )}
      <p
        className={`text-xs mt-2 flex items-center gap-1 ${
          highlight ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {trend !== undefined && trend !== null && (
          <span
            className={
              Number(trend) > 0
                ? 'text-emerald-400 flex items-center gap-0.5'
                : 'text-rose-400 flex items-center gap-0.5'
            }
          >
            {Number(trend) > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(Number(trend))}%
          </span>
        )}
        {subtitle}
      </p>
    </div>
  );

  if (activeTab === 'overview' && loading && !data) {
    return <PageLoader text="Loading Report" subtext="Getting your loan data ready..." minHeight="min-h-[600px]" />;
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Analytics & Portfolio</h1>
          <p className="text-sm text-slate-500 mt-1">
            See how lending is performing — money out, money in, and who is applying
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => switchTab('overview')}
            className={`px-6 py-2.5 rounded-lg text-xs font-medium uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => switchTab('portfolio')}
            className={`px-6 py-2.5 rounded-lg text-xs font-medium uppercase tracking-widest transition-all ${activeTab === 'portfolio' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Portfolio Health
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-10">
          {/* Quick Date Presets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(p => (
                <button key={p.label} onClick={() => { setDateRange(p.getValue()); setActivePreset(p.label); }}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activePreset === p.label ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                >{p.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)} className="rounded-lg gap-2">
                <Filter size={16} /> Filters
              </Button>
              <Button size="sm" variant="ghost" className="rounded-lg gap-2 text-slate-600" onClick={handleExportCSV}>
                <Download size={16} /> Export
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-lg border border-slate-100 p-6 shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2"><Filter size={14} /> Advanced Filters</h3>
                <Button size="sm" variant="ghost" onClick={() => { setAdvancedFilters({ status: '', state: '', amountMin: '', amountMax: '' }); setShowFilters(false); }}>
                  <X size={14} className="mr-1" /> Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Start Date</label>
                  <Input type="date" value={dateRange.startDate} onChange={e => { setDateRange({...dateRange, startDate: e.target.value}); setActivePreset(''); }} className="h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">End Date</label>
                  <Input type="date" value={dateRange.endDate} onChange={e => { setDateRange({...dateRange, endDate: e.target.value}); setActivePreset(''); }} className="h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Loan Status</label>
                  <select value={advancedFilters.status} onChange={e => setAdvancedFilters({...advancedFilters, status: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white">
                    <option value="">All Status</option>
                    <option value="disbursed">Given Out</option>
                    <option value="closed">Fully Repaid</option>
                    <option value="rejected">Rejected</option>
                    <option value="submitted">Applied</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">State</label>
                  <Input placeholder="e.g. Delhi" value={advancedFilters.state} onChange={e => setAdvancedFilters({...advancedFilters, state: e.target.value})} className="h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Min Amount</label>
                  <Input type="number" placeholder="₹0" value={advancedFilters.amountMin} onChange={e => setAdvancedFilters({...advancedFilters, amountMin: e.target.value})} className="h-10 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Max Amount</label>
                  <Input type="number" placeholder="₹∞" value={advancedFilters.amountMax} onChange={e => setAdvancedFilters({...advancedFilters, amountMax: e.target.value})} className="h-10 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="rounded-lg bg-rose-50 border-rose-100 text-rose-900">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Main Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            <MetricCard
              title="Money sent to customers"
              value={`₹${(stats.financials?.netDisbursedVolume || 0).toLocaleString('en-IN')}`}
              subtitle="Net amount paid out"
              trend={stats.financials?.growth?.volume}
              highlight
            />
            <MetricCard
              title="Total amount sanctioned"
              value={`₹${(stats.financials?.totalSanctionedVolume || 0).toLocaleString('en-IN')}`}
              subtitle="Approved loan value in period"
              highlight
            />
            <MetricCard
              title="Money received back"
              value={`₹${(stats.financials?.repaymentVolume || 0).toLocaleString('en-IN')}`}
              subtitle="Customer repayments"
              highlight
            />
            <MetricCard
              title="Interest earned"
              value={`₹${(stats.financials?.interestCollected || 0).toLocaleString('en-IN')}`}
              subtitle="From repayments"
            />
            <MetricCard
              title="Charges collected"
              value={`₹${(stats.financials?.processingFees || 0).toLocaleString('en-IN')}`}
              subtitle="Fees & setup charges"
            />
            <MetricCard
              title="Approval rate"
              value={`${stats.applications?.conversion || 0}%`}
              subtitle="% of applications that got a loan"
              trend={stats.applications?.growth?.conversion}
            />
            <MetricCard
              title="Average time to finish"
              value={`${stats.efficiency?.avgTatHours || 0}h`}
              subtitle="Apply to loan given"
              trend={stats.efficiency?.growthTat}
            />
          </div>

          {/* First-time vs returning */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Users size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  First-time vs returning customers
                </h4>
                <p className="text-xs text-slate-500">
                  Who started an application in this period
                </p>
              </div>
            </div>
            {((stats.retention?.new || 0) + (stats.retention?.repeat || 0)) === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
                No applications started in this period
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-around min-h-[260px]">
                <div className="w-full h-[220px] md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'First-time', value: stats.retention?.new || 0 },
                          { name: 'Returning', value: stats.retention?.repeat || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-3 px-2">
                  <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-indigo-600 font-medium">First-time</p>
                      <p className="text-xl font-semibold text-indigo-900 tabular-nums">
                        {stats.retention?.new || 0}
                      </p>
                    </div>
                    <div className="text-sm text-indigo-700 font-medium">
                      {Math.round(
                        ((stats.retention?.new || 0) /
                          ((stats.retention?.new || 0) + (stats.retention?.repeat || 0) || 1)) *
                          100
                      )}
                      %
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">Returning (reloan)</p>
                      <p className="text-xl font-semibold text-emerald-900 tabular-nums">
                        {stats.retention?.repeat || 0}
                      </p>
                    </div>
                    <div className="text-sm text-emerald-700 font-medium">
                      {Math.round(
                        ((stats.retention?.repeat || 0) /
                          ((stats.retention?.new || 0) + (stats.retention?.repeat || 0) || 1)) *
                          100
                      )}
                      %
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financial Breakdown + Loans by State */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 bg-white/80 backdrop-blur-xl border border-white/20 rounded-lg p-8 shadow-2xl shadow-slate-200/50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet size={20} /></div>
                  <div>
                    <h4 className="font-normal text-slate-900">Revenue Mix</h4>
                    <p className="text-xs text-slate-400">Where the income comes from</p>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'Interest', value: stats.financials?.interestCollected || 0 },
                          { name: 'Fees', value: stats.financials?.processingFees || 0 },
                          { name: 'GST', value: stats.financials?.gstAmount || 0 }
                        ]} 
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#6366f1" />
                        <Cell fill="#f43f5e" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                   <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Interest Collected</span>
                      <span>₹{(stats.financials?.interestCollected || 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Processing Fees</span>
                      <span>₹{(stats.financials?.processingFees || 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>GST Collected</span>
                      <span>₹{(stats.financials?.gstAmount || 0).toLocaleString()}</span>
                   </div>
                </div>

             </div>

             <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-white/20 rounded-lg p-8 shadow-2xl shadow-slate-200/50">
               <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><MapPin size={20} /></div>
                 <div>
                   <h4 className="font-normal text-slate-900 tracking-tight text-xl uppercase">Loans by State</h4>
                   <p className="text-sm text-slate-400">Which states are getting more loans</p>
                 </div>
               </div>
               <div className="overflow-x-auto rounded-lg border border-slate-100">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-100">
                       <th className="px-4 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-widest">State</th>
                       <th className="px-4 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-widest text-right">Applications</th>
                       <th className="px-4 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-widest text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {(stats.regional || []).map((region, i) => (
                       <tr key={i} className="hover:bg-slate-50/80">
                         <td className="px-4 py-3 text-sm text-slate-900">{region.state || 'Unknown'}</td>
                         <td className="px-4 py-3 text-sm text-slate-600 text-right tabular-nums">{region.application_count || 0}</td>
                         <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right tabular-nums">
                           ₹{Number(region.disbursed_volume || 0).toLocaleString()}
                         </td>
                       </tr>
                     ))}
                     {(stats.regional || []).length === 0 && (
                       <tr>
                         <td colSpan={3} className="px-4 py-10 text-center text-slate-400 italic">No state data found</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-lg p-8 shadow-xl shadow-slate-200/50">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Total Disbursed</p>
              {portfolioLoading ? (
                 <div className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
              ) : (
                 <h3 className="text-3xl font-medium text-slate-900 tracking-tight">
                   ₹{Number(portfolioData?.summary?.totalDisbursed || 0).toLocaleString()}
                 </h3>
              )}
              <p className="text-xs text-slate-400 mt-2">{portfolioLoading ? '-' : portfolioData?.summary?.totalLoans || 0} Total Loans</p>
            </div>
            <div className="bg-emerald-50/50 backdrop-blur-xl border border-emerald-100/50 rounded-lg p-8 shadow-xl shadow-emerald-200/20">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-widest mb-2">Total Collected</p>
              {portfolioLoading ? (
                 <div className="h-9 w-32 bg-emerald-200/50 rounded-lg animate-pulse mb-2"></div>
              ) : (
                 <h3 className="text-3xl font-medium text-emerald-900 tracking-tight">
                   ₹{Number(portfolioData?.summary?.totalCollected || 0).toLocaleString()}
                 </h3>
              )}
              <p className="text-xs text-emerald-500 mt-2">{portfolioLoading ? '-' : portfolioData?.summary?.collectionEfficiency || 0}% Efficiency</p>
            </div>
            <div className="bg-amber-50/50 backdrop-blur-xl border border-amber-100/50 rounded-lg p-8 shadow-xl shadow-amber-200/20">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-widest mb-2">Total Outstanding</p>
              {portfolioLoading ? (
                 <div className="h-9 w-32 bg-amber-200/50 rounded-lg animate-pulse mb-2"></div>
              ) : (
                 <h3 className="text-3xl font-medium text-amber-900 tracking-tight">
                   ₹{Number(portfolioData?.summary?.totalOutstanding || 0).toLocaleString()}
                 </h3>
              )}
              <p className="text-xs text-amber-500 mt-2">{portfolioLoading ? '-' : portfolioData?.summary?.pendingEmis || 0} Pending EMIs</p>
            </div>
            <div className="bg-rose-50/50 backdrop-blur-xl border border-rose-100/50 rounded-lg p-8 shadow-xl shadow-rose-200/20">
              <p className="text-xs font-medium text-rose-600 uppercase tracking-widest mb-2">Overdue Amount</p>
              {portfolioLoading ? (
                 <div className="h-9 w-32 bg-rose-200/50 rounded-lg animate-pulse mb-2"></div>
              ) : (
                 <h3 className="text-3xl font-medium text-rose-900 tracking-tight">
                   ₹{Number(portfolioData?.summary?.overdueAmount || 0).toLocaleString()}
                 </h3>
              )}
              <p className="text-xs text-rose-500 mt-2">{portfolioLoading ? '-' : portfolioData?.summary?.overdueEmis || 0} Overdue EMIs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* DPD Bucket Chart */}
            <div className="bg-white rounded-lg border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg"><PieIcon size={18} /></div>
                <div>
                  <h4 className="font-medium text-slate-900">Portfolio Quality</h4>
                  <p className="text-xs text-slate-400">Loans by DPD Bucket</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie 
                      data={Object.entries(portfolioData?.dpdDistribution || {}).map(([key, val]) => ({ name: key, value: val.count }))} 
                      cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                    >
                      {Object.keys(portfolioData?.dpdDistribution || {}).map((entry, index) => (
                        <Cell key={index} fill={entry === 'on_track' ? '#10b981' : COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {Object.entries(portfolioData?.dpdDistribution || {}).map(([key, val], idx) => (
                  <div key={key} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: key === 'on_track' ? '#10b981' : COLORS[idx % COLORS.length] }} />
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                    </div>
                    <span className="font-medium">{val.count} Loans (₹{Number(val.amount).toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Robust Customer Table */}
            <div className="lg:col-span-2 rounded-md border border-slate-200 bg-white overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input 
                    placeholder="Search Name, Mobile, PAN, or LAN" 
                    value={portfolioSearchInput}
                    onChange={(e) => setPortfolioSearchInput(e.target.value)}
                    className="pl-10 h-11 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={portfolioFilters.dpdBucket}
                    onChange={(e) => setPortfolioFilters({...portfolioFilters, dpdBucket: e.target.value, page: 1})}
                    className="h-11 px-4 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                  >
                    <option value="">All Buckets</option>
                    <option value="1-7">1-7 Days</option>
                    <option value="8-15">8-15 Days</option>
                    <option value="16-30">16-30 Days</option>
                    <option value="31-60">31-60 Days</option>
                    <option value="90+">90+ Days</option>
                  </select>
                  <Button variant="outline" className="h-11 rounded-lg gap-2 text-slate-600" onClick={handleExportCSV}>
                    <Download size={16} /> Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white">
                      <th className="px-6 py-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest">Customer / Account</th>
                      <th className="px-6 py-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest">Disbursed</th>
                      <th className="px-6 py-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest">Outstanding</th>
                      <th className="px-6 py-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest text-center">NPA Status</th>
                      <th className="px-6 py-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest text-center">DPD</th>
                      <th className="px-6 py-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {portfolioData?.customers?.map((customer) => (
                      <tr key={customer.applicationId} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{customer.customerName}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 tracking-wider">
                              {customerLoanRef(customer) || '—'} • {customer.customerMobile}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm text-slate-600 font-medium">₹{customer.disbursedAmount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm text-rose-600 font-medium">₹{customer.totalOutstanding.toLocaleString()}</span>
                            {customer.penaltyOutstanding > 0 && (
                              <span className="text-[10px] text-rose-400 mt-0.5">Incl. ₹{customer.penaltyOutstanding.toLocaleString()} Penalty</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight ${
                            customer.npaClassification === 'Standard' ? 'bg-emerald-50 text-emerald-600' :
                            customer.npaClassification === 'SMA-0' ? 'bg-amber-50 text-amber-600' :
                            customer.npaClassification === 'SMA-1' ? 'bg-orange-50 text-orange-600' :
                            'bg-rose-50 text-rose-600'
                          }`}>
                            {customer.npaClassification}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${customer.maxDPD > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {customer.maxDPD > 0 ? `${customer.maxDPD} Days` : 'On Track'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <Button 
                            variant="ghost" size="sm" 
                            className="rounded-lg hover:bg-slate-900 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            onClick={() => navigate(applicationDetailPath(customer.loanAccountNumber || customer.leadId || customer.applicationId))}
                          >
                            <ArrowRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!portfolioData?.customers?.length && !portfolioLoading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">No customers found matching filters</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-white">
                <p className="text-xs text-slate-500">
                  Showing {portfolioData?.customers?.length || 0} of {portfolioData?.pagination?.total || 0} records
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" variant="outline" 
                    disabled={portfolioFilters.page <= 1}
                    onClick={() => setPortfolioFilters({...portfolioFilters, page: portfolioFilters.page - 1})}
                    className="h-9 px-4 rounded-lg"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-medium px-4">Page {portfolioFilters.page}</span>
                  <Button 
                    size="sm" variant="outline" 
                    disabled={portfolioFilters.page >= (portfolioData?.pagination?.totalPages || 1)}
                    onClick={() => setPortfolioFilters({...portfolioFilters, page: portfolioFilters.page + 1})}
                    className="h-9 px-4 rounded-lg"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Simple Explanation Section for Staff */}
          <div className="bg-slate-900 rounded-lg p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-[10px] uppercase tracking-widest font-medium text-emerald-400">
                  <Activity size={12} /> How it works
                </div>
                <h2 className="text-4xl font-medium tracking-tight">Understanding the Collection Cycle</h2>
                <p className="text-slate-400 leading-relaxed max-w-lg">
                  When a loan is given (Disbursed), it moves through a cycle. If a customer misses a payment, it enters the collection module where penalties accrue daily and agents begin follow-ups.
                </p>
                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><IndianRupee size={20} /></div>
                    <h4 className="text-sm font-medium">Disbursed</h4>
                    <p className="text-xs text-slate-500">The total money we gave to customers.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Check size={20} /></div>
                    <h4 className="text-sm font-medium">Collected</h4>
                    <p className="text-xs text-slate-500">The money we successfully got back.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400"><AlertTriangle size={20} /></div>
                    <h4 className="text-sm font-medium">Outstanding</h4>
                    <p className="text-xs text-slate-500">Money yet to be paid by customers.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400"><Clock size={20} /></div>
                    <h4 className="text-sm font-medium">DPD</h4>
                    <p className="text-xs text-slate-500">"Days Past Due" — how many days late they are.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg border border-white/10 p-8 space-y-8 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs uppercase tracking-widest text-slate-400 font-medium">The Recovery Path</h5>
                  <span className="text-[10px] text-slate-500 italic">Day 1 to 90+</span>
                </div>
                <div className="space-y-6">
                  {[
                    { day: '1-3', title: 'Soft Reminders', desc: 'Automatic SMS & Calls sent to customer.', color: 'bg-emerald-500' },
                    { day: '4-7', title: 'Agent Calling', desc: 'Collection agents talk to customers.', color: 'bg-blue-500' },
                    { day: '10+', title: 'Field Visit', desc: 'Agent visits the physical address.', color: 'bg-amber-500' },
                    { day: '30+', title: 'Legal & Bureau', desc: 'Credit score impact & Legal notices.', color: 'bg-rose-500' }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${step.color} ring-4 ring-white/5`} />
                        {i !== 3 && <div className="w-px h-full bg-white/10 my-1" />}
                      </div>
                      <div className="pb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-200">Day {step.day}</span>
                          <span className="text-sm font-medium text-white">{step.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
