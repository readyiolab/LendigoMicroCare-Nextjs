import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from '@/lib/router';
import { FileCheck } from 'lucide-react';
import { adminAPI } from '@/lib/api/admin';
import { documentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import ApplicationDetailSheet from '@/components/admin/ApplicationDetailSheet.jsx';

import RepaymentFilters from '@/components/admin/repayments/RepaymentFilters';
import RepaymentTable from '@/components/admin/repayments/RepaymentTable';

const STATUS_FILTERS = [
  { label: 'Under Review', value: 'under_review', color: 'blue' },
  { label: 'Verified Paid', value: 'paid', color: 'emerald' },
  { label: 'Rejected', value: 'rejected', color: 'red' },
  { label: 'Pending Submission', value: 'pending', color: 'amber' },
  { label: 'All', value: 'all', color: 'slate' },
];

const SEARCH_DEBOUNCE_MS = 300;

export default function AdminRepayments() {
  const navigate = useNavigate();
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'under_review',
    search: '',
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEmiId, setSelectedEmiId] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fetchGenRef = useRef(0);

  const fetchRepayments = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    try {
      setLoading(true);
      const response = await adminAPI.getRepayments({
        status: filters.status,
        search: filters.search,
        page: filters.page,
        limit: filters.limit,
      });

      if (gen !== fetchGenRef.current) return;

      if (response.status === 1) {
        setRepayments(response.data.repayments || []);
        setPagination(response.data.pagination || { totalPages: 1 });
      }
    } catch (error) {
      if (gen !== fetchGenRef.current) return;
      console.error('Fetch repayments error:', error);
    } finally {
      if (gen === fetchGenRef.current) {
        setLoading(false);
      }
    }
  }, [filters.status, filters.search, filters.page, filters.limit]);

  useEffect(() => {
    fetchRepayments();
  }, [fetchRepayments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput, page: 1 };
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const applySearchNow = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchInput,
      page: 1,
    }));
  }, [searchInput]);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        applySearchNow();
      }
    },
    [applySearchNow]
  );

  const openApplication = useCallback((appId, emiId = null) => {
    setSelectedApp(appId);
    setSelectedEmiId(emiId);
    setIsSheetOpen(true);
  }, []);

  const handleViewFile = useCallback(async (docType, url, appNumber) => {
    if (!url) return;
    try {
      setUploading(true);
      const u = url.toLowerCase();
      const isImage = u.includes('/image/upload/') || u.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/);
      if (isImage) {
        window.open(url, '_blank');
        return;
      }
      const proxyUrl = documentsAPI.getDownloadUrl(docType, appNumber, url);
      window.open(proxyUrl, '_blank');
    } catch (err) {
      console.error('View failed', err);
    } finally {
      setUploading(false);
    }
  }, []);

  const statusFilters = useMemo(() => STATUS_FILTERS, []);

  return (
    <div className="space-y-4 min-h-screen bg-slate-50/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl text-slate-900 font-semibold tracking-tight">Repayments</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Verify and track loan installments across the platform.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/admin/reconciliation')}
          className="h-9 px-3 border-slate-200 text-slate-700 hover:bg-white gap-2"
        >
          <FileCheck className="w-4 h-4" />
          Bulk Reconciliation
        </Button>
      </div>

      <RepaymentFilters
        filters={filters}
        setFilters={setFilters}
        statusFilters={statusFilters}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        handleSearch={handleSearchKeyDown}
        applySearchNow={applySearchNow}
      />

      <RepaymentTable
        loading={loading}
        repayments={repayments}
        filters={filters}
        pagination={pagination}
        setFilters={setFilters}
        openApplication={openApplication}
        handleViewFile={handleViewFile}
        uploading={uploading}
      />

      {selectedApp && (
        <ApplicationDetailSheet
          applicationId={selectedApp}
          targetEmiId={selectedEmiId}
          defaultTab="repayments"
          isRepaymentReview={true}
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setSelectedEmiId(null);
          }}
          onUpdate={fetchRepayments}
        />
      )}
    </div>
  );
}
