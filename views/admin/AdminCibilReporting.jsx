import React, { useCallback, useEffect, useState } from 'react';
import { cibilApi } from '@/lib/api/cibil';
import { useNotifications } from '@/contexts';
import CibilSubmissionFormHeader from '@/components/admin/cibil/CibilSubmissionFormHeader';
import CibilSegmentDataGrid from '@/components/admin/cibil/CibilSegmentDataGrid';
import CibilCycleToolbar from '@/components/admin/cibil/CibilCycleToolbar';
import CibilValidationBanner from '@/components/admin/cibil/CibilValidationBanner';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';

function toDdmmyyyy(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).split('-');
  if (!y || !m || !d) return '';
  return `${d}${m}${y}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminCibilReporting() {
  const { toast } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [cycle, setCycle] = useState(null);
  const [records, setRecords] = useState([]);
  const [errors, setErrors] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [onlyInvalid, setOnlyInvalid] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);

  const [header, setHeader] = useState({
    memberId: '',
    shortName: '',
    cycleCode: 'NB',
    reportingDateDdmmyyyy: toDdmmyyyy(todayIso()),
    reportingPassword: '',
    authenticationMethod: 'A',
    futureUse: '',
    memberData: '',
  });
  const [passwordSet, setPasswordSet] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    state: '',
    statuses: ['disbursed', 'closed', 'settled', 'defaulted'],
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await cibilApi.getHeaderDefaults();
        const d = res?.data || res;
        if (d) {
          setHeader((prev) => ({
            ...prev,
            memberId: d.memberId || prev.memberId,
            shortName: d.shortName || prev.shortName,
            cycleCode: d.cycleCode || prev.cycleCode,
            authenticationMethod: d.authenticationMethod || prev.authenticationMethod,
          }));
          setPasswordSet(Boolean(d.reportingPasswordSet));
        }
      } catch (_) {
        /* defaults stay empty until env configured */
      }
    })();
  }, []);

  const refreshGrid = useCallback(
    async (cycleId, nextPage = page) => {
      if (!cycleId) return;
      setGridLoading(true);
      try {
        const [gridRes, errRes] = await Promise.all([
          cibilApi.getCycleGrid(cycleId, {
            page: nextPage,
            pageSize: 50,
            onlyInvalid: onlyInvalid ? '1' : '0',
            mask: '1',
          }),
          cibilApi.getValidationErrors(cycleId, { limit: 300 }),
        ]);
        const grid = gridRes?.data || gridRes;
        setRecords(grid?.records || []);
        setReconciliation(grid?.reconciliation || null);
        setCycle(grid?.cycle || null);
        setTotal(grid?.pagination?.total || 0);
        setErrors(errRes?.data || errRes || []);
      } catch (err) {
        toast('Error', err.response?.data?.message || 'Failed to load grid');
      } finally {
        setGridLoading(false);
      }
    },
    [onlyInvalid, page, toast]
  );

  useEffect(() => {
    if (cycle?.id) refreshGrid(cycle.id, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyInvalid, page]);

  const reportingDateIso = () => {
    const d = header.reportingDateDdmmyyyy;
    if (/^\d{8}$/.test(d)) {
      return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
    }
    return todayIso();
  };

  const handleCreateAndLoad = async () => {
    if (!filters.startDate || !filters.endDate) {
      toast('Error', 'Select disbursed-from and disbursed-to dates');
      return;
    }
    if (!header.memberId || !header.shortName) {
      toast('Error', 'Set Reporting Member ID and Short Name in the header');
      return;
    }
    setBusy(true);
    try {
      const created = await cibilApi.createCycle({
        cycleCode: header.cycleCode || 'NB',
        reportingDate: reportingDateIso(),
        memberId: header.memberId,
        shortName: header.shortName,
        authenticationMethod: header.authenticationMethod || 'A',
        futureUse: header.futureUse,
        memberData: header.memberData,
        startDate: filters.startDate,
        endDate: filters.endDate,
        state: filters.state || null,
        statuses: filters.statuses,
      });
      const cycleRow = created?.data || created;
      const loaded = await cibilApi.loadCycle(cycleRow.id);
      const loadedCycle = loaded?.data || loaded;
      setCycle(loadedCycle);
      setPage(1);
      await refreshGrid(loadedCycle.id, 1);
      toast('Success', `Loaded ${loadedCycle.eligible_count || 0} eligible account(s)`);
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Failed to load from LOS');
    } finally {
      setBusy(false);
    }
  };

  const handleValidateHint = () => {
    if (!cycle) {
      toast('Error', 'Load accounts first');
      return;
    }
    if (Number(cycle.failed_count) > 0) {
      toast('Warning', `${cycle.failed_count} row(s) still fail mandatory checks — see list below`);
      setOnlyInvalid(true);
    } else {
      toast('Success', 'All loaded rows passed mandatory field checks');
    }
  };

  const handleGenerate = async () => {
    if (!cycle?.id) return;
    setBusy(true);
    try {
      const res = await cibilApi.generateCycle(cycle.id);
      const data = res?.data || res;
      setCycle(data.cycle || cycle);
      setReconciliation(data.reconciliation || reconciliation);
      toast('Success', `Generated ${data.recordCount || 0} TUDF record(s)`);
      if (data.specPending) {
        toast('Info', 'Official TUDF spec not loaded — download allowed; production submit blocked');
      }
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Generate failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!cycle?.id) return;
    setBusy(true);
    try {
      await cibilApi.downloadCycle(cycle.id);
      toast('Success', 'CIBIL Excel report downloaded');
      await refreshGrid(cycle.id, page);
    } catch (err) {
      toast(
        'Error',
        err.message || err.response?.data?.message || 'Excel download failed — Load from LOS first'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!cycle?.id) return;
    setBusy(true);
    try {
      const res = await cibilApi.submitCycle(cycle.id, {});
      setCycle(res?.data || res);
      toast('Success', 'Cycle marked submitted');
    } catch (err) {
      toast('Error', err.response?.data?.message || 'Submit blocked');
    } finally {
      setBusy(false);
    }
  };

  const handleTemplate = async () => {
    try {
      await cibilApi.downloadTemplate();
      toast('Success', 'Excel template downloaded');
    } catch (_) {
      toast('Error', 'Template download failed');
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">CIBIL Reporting</h1>
          <p className="text-xs text-slate-500">
            Excel-style Data Submission Form — load LOS accounts, validate, generate TUDF
          </p>
        </div>
        <Button type="button" variant="outline" className="h-9 rounded-none text-xs" onClick={handleTemplate}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Manual Excel template
        </Button>
      </div>

      <CibilSubmissionFormHeader
        header={header}
        onChange={setHeader}
        passwordSet={passwordSet}
      />

      <CibilCycleToolbar
        filters={filters}
        onFiltersChange={setFilters}
        reconciliation={reconciliation}
        busy={busy}
        onCreateAndLoad={handleCreateAndLoad}
        onValidateHint={handleValidateHint}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
        onSubmit={handleSubmit}
        cycle={cycle}
        onlyInvalid={onlyInvalid}
        onOnlyInvalidChange={(v) => {
          setOnlyInvalid(v);
          setPage(1);
        }}
      />

      <CibilValidationBanner errors={errors} />

      <CibilSegmentDataGrid records={records} errors={errors} loading={gridLoading} />

      {total > 50 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Page {page} of {pageCount} · {total} row(s)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none"
              disabled={page >= pageCount || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
