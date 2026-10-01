import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Download, 
  Plus,
  BookOpen
} from 'lucide-react';
import { adminAPI } from '../../lib/api/admin';
import { Button } from '@/components/ui/button';
import { format, subDays } from 'date-fns';

// Modular Components
import LedgerSummary from '@/components/admin/ledger/LedgerSummary.jsx';
import AccountSummary from '@/components/admin/ledger/AccountSummary.jsx';
import LedgerFilters from '@/components/admin/ledger/LedgerFilters.jsx';
import LedgerTable from '@/components/admin/ledger/LedgerTable.jsx';
import { LedgerAdjustmentModal, LedgerDetailSheet } from '@/components/admin/ledger/LedgerModals.jsx';
import ApplicationDetailSheet from '@/components/admin/ApplicationDetailSheet.jsx';
import { PageLoader } from '@/components/ui/PageLoader';

const AdminLedgerBook = () => {
  // --- State Identification ---
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({
    total_disbursed: 0,
    total_collected: 0,
    outstanding_principal: 0,
    interest_accrued: 0,
    penalties_accrued: 0
  });
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    entryType: '',
    accountName: '',
    search: '',
    amountMin: '',
    amountMax: ''
  });

  // UI States
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showLoanSheet, setShowLoanSheet] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    loanId: '',
    userId: '',
    entryType: 'ADMIN_ADJUSTMENT',
    description: '',
    debitAccount: '',
    creditAccount: '',
    amount: ''
  });

  // --- Logic Layer ---

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, summaryRes, accountsRes] = await Promise.all([
        adminAPI.getLedgerEntries({ ...filters, page: pagination.page, limit: pagination.limit }),
        adminAPI.getLedgerSummary({ startDate: filters.startDate, endDate: filters.endDate }),
        adminAPI.getLedgerAccounts({ startDate: filters.startDate, endDate: filters.endDate })
      ]);

      setEntries(entriesRes.data?.entries || []);
      setPagination(prev => ({ ...prev, total: entriesRes.data?.pagination?.total || 0 }));
      setSummary(summaryRes.data || {
        total_disbursed: 0,
        total_collected: 0,
        outstanding_principal: 0,
        interest_accrued: 0,
        penalties_accrued: 0
      });
      setAccounts(accountsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch ledger data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle filter/page resets
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      entryType: '',
      accountName: '',
      search: '',
      amountMin: '',
      amountMax: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePostAdjustment = useCallback(async (e) => {
    e.preventDefault();
    
    if (adjustmentData.debitAccount === adjustmentData.creditAccount) {
      alert('Error: "From" and "To" accounts cannot be the same. Please select different accounts for the adjustment.');
      return;
    }

    const amount = parseFloat(adjustmentData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Error: Please enter a valid transaction amount greater than zero.');
      return;
    }

    try {
      const payload = {
        loanId: adjustmentData.loanId || null,
        userId: adjustmentData.userId || null,
        entryType: adjustmentData.entryType,
        description: adjustmentData.description,
        postings: [
          { accountName: adjustmentData.debitAccount, debit: amount, credit: 0 },
          { accountName: adjustmentData.creditAccount, debit: 0, credit: amount }
        ]
      };

      await adminAPI.postLedgerAdjustment(payload);
      setShowAdjustmentModal(false);
      setAdjustmentData({
        loanId: '', userId: '', entryType: 'ADMIN_ADJUSTMENT', description: '',
        debitAccount: '', creditAccount: '', amount: ''
      });
      fetchData();
      alert('Ledger adjustment posted successfully and accounts are correctly balanced.');
    } catch (err) {
      alert(`Ledger Error: ${err.response?.data?.message || err.message}`);
    }
  }, [adjustmentData, fetchData]);

  const handleOpenLoan = useCallback((loanId) => {
    if (!loanId) return;
    setShowLoanSheet(true);
  }, []);

  // --- Render Layer ---

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-700">
      
      {/* main Header */}
      <div className="relative overflow-hidden rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-950 rounded-lg shadow-lg shadow-slate-200">
               <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
               <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Money Book</h1>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  All money records
               </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => {/* MIS Export Logic */}}
              className="h-10 px-4 rounded-lg border-slate-100 text-slate-500 hover:text-slate-900 shadow-sm transition-all text-[10px] font-black uppercase tracking-widest bg-white"
            >
              <Download size={14} className="mr-2 opacity-60" /> Export
            </Button>
            <Button 
              onClick={() => setShowAdjustmentModal(true)}
              className="h-10 px-4 rounded-lg bg-slate-950 text-white hover:bg-slate-900 shadow-xl shadow-slate-300 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <Plus size={14} className="mr-2" /> New Adjustment
            </Button>
          </div>
        </div>
        
        {/* Background Aesthetic */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/40 rounded-full blur-[100px] -mr-48 -mt-48 animate-pulse" />
      </div>

      {/* Summary Matrix */}
      <LedgerSummary summary={summary} />

      {/* Persistence Controls (Filters) */}
      <LedgerFilters 
        filters={filters} 
        setFilters={handleFilterChange} 
        onReset={handleResetFilters} 
      />

      {/* Account Distribution Hierarchy */}
      <AccountSummary accounts={accounts} />

      {/* Main Journal Table */}
      <LedgerTable 
        entries={entries}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onViewDetails={setSelectedEntry}
      />

      {/* Modals & Persistence Layers */}
      <LedgerAdjustmentModal 
        open={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        data={adjustmentData}
        setData={setAdjustmentData}
        onSubmit={handlePostAdjustment}
      />

      <LedgerDetailSheet 
        entry={selectedEntry}
        open={Boolean(selectedEntry)}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
        onOpenLoan={handleOpenLoan}
      />

      <ApplicationDetailSheet
        applicationId={showLoanSheet ? selectedEntry?.loan_application_id : null}
        isOpen={showLoanSheet}
        onClose={() => setShowLoanSheet(false)}
        onUpdate={fetchData}
      />
    </div>
  );
};

export default AdminLedgerBook;
