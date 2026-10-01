import React, { useCallback } from 'react';
import { Search, Filter, X, Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminAPI } from '@/lib/api/admin';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, subMonths } from 'date-fns';

const ENTRY_TYPES = [
  { value: 'DISBURSEMENT', label: 'Loan Sent' },
  { value: 'REPAYMENT', label: 'Payment Received' },
  { value: 'PENALTY_ACCRUAL', label: 'Penalty Added' },
  { value: 'INTEREST_ACCRUAL', label: 'Interest Added' },
  { value: 'ADMIN_ADJUSTMENT', label: 'Manual Adjustment' },
];

const ACCOUNT_NAMES = [
  { value: 'Cash_At_Bank', label: 'Bank Account' },
  { value: 'Loan_Receivable', label: 'Loan Balance' },
  { value: 'Interest_Income', label: 'Interest Earned' },
  { value: 'Penal_Interest_Income', label: 'Penalty Earned' },
  { value: 'Fee_Income', label: 'Service Charges' },
  { value: 'GST_Payable', label: 'Tax (GST)' },
];

const DATE_PRESETS = [
  { label: 'Today', getRange: () => ({ startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Yesterday', getRange: () => ({ startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'), endDate: format(subDays(new Date(), 1), 'yyyy-MM-dd') }) },
  { label: 'This Week', getRange: () => ({ startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'This Month', getRange: () => ({ startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Last Month', getRange: () => { const d = subMonths(new Date(), 1); return { startDate: format(startOfMonth(d), 'yyyy-MM-dd'), endDate: format(endOfMonth(d), 'yyyy-MM-dd') }; } },
];

export default function LedgerFilters({ filters, setFilters, onReset }) {

  const handleExport = useCallback(async () => {
    try {
      const res = await adminAPI.exportLedgerCSV({
        startDate: filters.startDate,
        endDate: filters.endDate,
        entryType: filters.entryType,
        accountName: filters.accountName,
        search: filters.search
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ledger_export_${filters.startDate}_to_${filters.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  }, [filters]);

  return (
    <Card className="border-slate-100 shadow-sm rounded-lg overflow-hidden animate-in fade-in duration-700">
      <CardHeader className="bg-slate-50/30 border-b border-slate-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-slate-900 tracking-tight flex items-center gap-2">
              <Filter size={16} className="text-blue-500" /> Search & Filter
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-medium">
              Find entries by date, type, account, or amount
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} className="rounded-lg gap-2 text-xs font-medium">
            <Download size={14} /> Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {/* Quick Date Presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium flex items-center mr-2"><Calendar size={12} className="mr-1" /> Quick:</span>
          {DATE_PRESETS.map(p => (
            <button key={p.label} onClick={() => setFilters({ ...filters, ...p.getRange() })}
              className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-white border border-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-all">
              {p.label}
            </button>
          ))}
        </div>

        {/* Main Filters */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-7 items-end">
          {/* Search */}
          <div className="xl:col-span-2 relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name, mobile, loan #..."
              className="h-12 pl-11 rounded-lg border-slate-100 bg-slate-50/50 text-sm font-medium focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-400 ml-1">From Date</label>
            <Input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="h-12 rounded-lg border-slate-100 bg-slate-50/50 text-[13px] font-medium" />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-400 ml-1">To Date</label>
            <Input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="h-12 rounded-lg border-slate-100 bg-slate-50/50 text-[13px] font-medium" />
          </div>

          {/* Transaction Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-400 ml-1">Type</label>
            <select value={filters.entryType} onChange={(e) => setFilters({...filters, entryType: e.target.value})}
              className="w-full h-12 px-4 rounded-lg border border-slate-100 bg-slate-50/50 text-[13px] font-medium outline-none appearance-none">
              <option value="">All Types</option>
              {ENTRY_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-400 ml-1">Account</label>
            <select value={filters.accountName || ''} onChange={(e) => setFilters({...filters, accountName: e.target.value})}
              className="w-full h-12 px-4 rounded-lg border border-slate-100 bg-slate-50/50 text-[13px] font-medium outline-none appearance-none">
              <option value="">All Accounts</option>
              {ACCOUNT_NAMES.map(a => (<option key={a.value} value={a.value}>{a.label}</option>))}
            </select>
          </div>

          {/* Clear */}
          <div>
            <Button type="button" variant="outline" onClick={onReset}
              className="h-12 w-full px-4 rounded-lg border-slate-100 bg-white text-slate-400 hover:text-slate-900 transition-all font-medium">
              <X size={16} className="mr-2 opacity-60" /> Clear
            </Button>
          </div>
        </div>

        {/* Amount Range Row */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-400 ml-1">Min Amount (₹)</label>
            <Input type="number" placeholder="0" value={filters.amountMin || ''} onChange={(e) => setFilters({...filters, amountMin: e.target.value})}
              className="h-10 w-40 rounded-lg border-slate-100 bg-slate-50/50 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-medium tracking-[0.2em] text-slate-400 ml-1">Max Amount (₹)</label>
            <Input type="number" placeholder="No limit" value={filters.amountMax || ''} onChange={(e) => setFilters({...filters, amountMax: e.target.value})}
              className="h-10 w-40 rounded-lg border-slate-100 bg-slate-50/50 text-sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
