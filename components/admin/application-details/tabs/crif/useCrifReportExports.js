import { useState } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { enquiryWindowCounts } from '@/lib/utils/crifLoanGroups';
import { downloadCrifExcel, flattenLoanGroups } from '@/lib/utils/crifExcelExport';

export default function useCrifReportExports({
  applicationRef,
  loanApp,
  summary,
  detail,
  consumer,
  band,
  loanGroups,
  filteredInquiries,
  canExportExcel,
  setMessage,
  handleForceCrifRefetch,
  load,
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);
  const [refetchOpen, setRefetchOpen] = useState(false);

  const fetchPdfUrl = async () => {
    if (!applicationRef || !summary?.id || !summary?.hasPdf) return null;
    const res = await adminAPI.getCreditBureauPdfUrl(applicationRef, summary.id);
    if (res?.status === 1 && res.data?.url) return res.data.url;
    throw new Error(res?.message || 'PDF not available');
  };

  const openPdf = async () => {
    setPdfLoading(true);
    try {
      const url = await fetchPdfUrl();
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setMessage?.(err.response?.data?.message || err.message || 'PDF open failed');
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadPdf = async () => {
    setPdfDownloading(true);
    try {
      const url = await fetchPdfUrl();
      if (!url) return;
      const fileName = `CIBIL-${String(applicationRef || 'report').replace(/[^\w.-]+/g, '_')}-${summary.id}.pdf`;
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        // CORS or network — fall back to opening signed URL with download hint
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setMessage?.(err.response?.data?.message || err.message || 'PDF download failed');
    } finally {
      setPdfDownloading(false);
    }
  };

  const exportExcel = async () => {
    if (!canExportExcel) return;
    setExcelExporting(true);
    try {
      const fileName = await downloadCrifExcel({
        summary,
        tradelines: flattenLoanGroups(loanGroups),
        inquiries: filteredInquiries,
        inquiryCounts: enquiryWindowCounts(detail?.inquiry_history || []),
        meta: {
          applicationRef,
          leadId: loanApp?.lead_id || applicationRef,
          customerName: loanApp?.full_name || loanApp?.customer_name || consumer?.name,
          customerCode: loanApp?.customer_code,
          loanAccountNumber: loanApp?.loan_account_number,
          riskBand: band?.label,
        },
      });
      setMessage?.(`Exported ${fileName}`);
    } catch (err) {
      setMessage?.(err.message || 'Excel export failed');
    } finally {
      setExcelExporting(false);
    }
  };

  const confirmRefetch = async () => {
    setRefetchOpen(false);
    setMessage?.('Re-fetching CRIF from the bureau (this may incur a Digitap charge)…');
    await handleForceCrifRefetch?.();
    await load();
  };

  return {
    pdfLoading,
    pdfDownloading,
    excelExporting,
    refetchOpen,
    setRefetchOpen,
    openPdf,
    downloadPdf,
    exportExcel,
    confirmRefetch,
  };
}
