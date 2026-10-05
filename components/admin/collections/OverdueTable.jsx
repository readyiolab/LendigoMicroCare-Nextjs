import React, { useState } from 'react';
import { useNavigate } from '@/lib/router';
import { account360Path } from '@/utils/customerIdentity';
import { collectionAPI } from '@/lib/api/collection';
import { downloadBlob, filenameFromContentDisposition } from '@/utils/downloadBlob';
import {
  AlertTriangle,
  CheckCircle2,
  Phone,
  IndianRupee,
  Plus,
  MessageSquare,
  Clock,
  MapPin,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import CalendarDatePicker from '@/components/ui/CalendarDatePicker';
import { PageLoader } from '@/components/ui/PageLoader';
import CollectionFilterBar from '@/components/admin/collections/shared/CollectionFilterBar';
import CollectionDataTable from '@/components/admin/collections/shared/CollectionDataTable';
import { DpdStatusBadge } from '@/components/admin/collections/shared/CollectionStatusBadge';
import { formatInr } from '@/components/admin/collections/shared/collectionUi';

const BUCKET_OPTIONS = [
  { value: 'all', label: 'All overdue' },
  { value: 'due-today', label: 'Due today' },
  { value: 'pre-due-3', label: 'Due today–3 days' },
  { value: 'soft-1-7', label: 'DPD 1–7 (soft)' },
  { value: 'hard-8-15', label: 'DPD 8–15 (hard)' },
  { value: 'visit-10-plus', label: '10+ days (visit)' },
];

function emptyDescription(filters) {
  if (filters.startDate || filters.endDate) {
    return 'No pending repayments in this due-date range. Clear the date filter or pick another period from Overview.';
  }
  if (filters.dpdBucket === 'due-today' || filters.dpdBucket === 'pre-due-3') {
    return 'Try another filter, or check Overview for due-today totals.';
  }
  if (filters.dpdBucket) {
    return 'No loans match this bucket. Loans due today are not overdue until the due date passes.';
  }
  if (filters.visitRequired) {
    return 'No overdue loans flagged for field visit. Clear “Visit Required” or check Overview.';
  }
  if (filters.search?.trim()) {
    return 'No match for this search. Try application ID or mobile number.';
  }
  return 'No past-due rows returned. If Overview still shows overdue, refresh or clear filters.';
}

function formatChipDate(iso) {
  if (!iso) return '';
  try {
    return format(new Date(`${iso}T12:00:00`), 'dd MMM');
  } catch {
    return iso;
  }
}

export default function OverdueTable({
  data,
  loading,
  filters,
  setFilters,
  onFilterChange,
  searchInput,
  setSearchInput,
  onViewContact,
  onViewPenalty,
  onAddRemark,
  onViewRemarks,
  onCollect,
}) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExportMis = async () => {
    setExporting(true);
    try {
      const status =
        filters.dpdBucket === 'due-today'
          ? 'due_today'
          : filters.dpdBucket === 'pre-due-3'
            ? 'upcoming'
            : filters.dpdBucket
              ? 'overdue'
              : 'all';
      const response = await collectionAPI.exportPendingCollectionMIS({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        search: filters.search || undefined,
        status,
        format: 'csv',
      });
      const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data || response]);
      const header = response?.headers?.['content-disposition'];
      downloadBlob(
        blob,
        filenameFromContentDisposition(header, 'Pending_Collection_MIS.csv'),
        'text/csv'
      );
    } catch (err) {
      console.error('MIS export failed', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <PageLoader text="Checking overdue loans..." minHeight="min-h-[400px]" />;
  }

  const repayments = data?.repayments || [];
  const pagination = data?.pagination || {};
  const summary = data?.summary || {};
  const dpdValue = filters.dpdBucket || 'all';

  const emptyTitle =
    filters.startDate || filters.endDate
      ? 'No pending loans in this period'
      : filters.dpdBucket === 'due-today' || filters.dpdBucket === 'pre-due-3'
        ? 'No loans in this due window'
        : 'No overdue loans';

  const hasDateRange = Boolean(filters.startDate || filters.endDate);
  const dateChipLabel = hasDateRange
    ? `Pending due: ${formatChipDate(filters.startDate) || '…'}–${formatChipDate(filters.endDate) || '…'}`
    : '';

  return (
    <div className="space-y-4">
      {(hasDateRange || filters.dpdBucket) && (
        <div className="flex flex-wrap items-center gap-2">
          {hasDateRange && (
            <button
              type="button"
              onClick={() => onFilterChange({ startDate: '', endDate: '' })}
              className="inline-flex items-center gap-1.5 border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              {dateChipLabel}
              <X className="w-3 h-3" />
            </button>
          )}
          {filters.dpdBucket && (
            <button
              type="button"
              onClick={() => onFilterChange({ dpdBucket: '' })}
              className="inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {BUCKET_OPTIONS.find((o) => o.value === filters.dpdBucket)?.label || filters.dpdBucket}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <CollectionFilterBar
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportMis}
            disabled={exporting}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Preparing…' : 'Download report'}
          </Button>
        }
      >
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">DPD bucket</Label>
          <Select
            value={dpdValue}
            onValueChange={(val) =>
              onFilterChange({ dpdBucket: val === 'all' ? '' : val })
            }
          >
            <SelectTrigger className="h-8 w-[180px] text-xs rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant={filters.visitRequired ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilters({ ...filters, visitRequired: !filters.visitRequired, page: 1 })}
          className={cn('h-8 gap-1.5 text-xs', filters.visitRequired && 'bg-red-600 hover:bg-red-700')}
        >
          <MapPin className="w-3.5 h-3.5" />
          Visit required
        </Button>

        <Button
          type="button"
          variant={filters.myQueue ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilters({ ...filters, myQueue: !filters.myQueue, page: 1 })}
          className="h-8 gap-1.5 text-xs"
        >
          My queue
        </Button>

        <Button
          type="button"
          variant={filters.loanLevel ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilters({ ...filters, loanLevel: !filters.loanLevel, page: 1 })}
          className="h-8 gap-1.5 text-xs"
        >
          Loan view
        </Button>

        <div className="flex items-end gap-2 border-l border-slate-200 pl-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">From</Label>
            <CalendarDatePicker
              date={filters.startDate}
              onSelect={(val) => onFilterChange({ startDate: val })}
              placeholder="Start"
              className="w-32"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">To</Label>
            <CalendarDatePicker
              date={filters.endDate}
              onSelect={(val) => onFilterChange({ endDate: val })}
              placeholder="End"
              className="w-32"
            />
          </div>
          {(filters.startDate || filters.endDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 mb-0.5"
              title="Clear dates"
              onClick={() => onFilterChange({ startDate: '', endDate: '' })}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs text-slate-500">Search</Label>
          <Input
            placeholder="Borrower or loan #"
            className="h-8 text-xs rounded-none"
            value={searchInput != null ? searchInput : filters.search || ''}
            onChange={(e) => {
              if (setSearchInput) setSearchInput(e.target.value);
              else setFilters({ ...filters, search: e.target.value, page: 1 });
            }}
          />
        </div>
      </CollectionFilterBar>

      {summary.totalOverdue > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50/50 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium text-red-900">
              {summary.totalOverdue} loans in collection
            </span>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-xs text-red-600/80">Principal due </span>
              <span className="font-semibold tabular-nums text-red-800">
                {formatInr(summary.totalPrincipalDue)}
              </span>
            </div>
            <div>
              <span className="text-xs text-red-600/80">Late charges </span>
              <span className="font-semibold tabular-nums text-red-700">
                {formatInr(summary.totalPenaltyDue)}
              </span>
            </div>
          </div>
        </div>
      )}

      <CollectionDataTable
        emptyIcon={CheckCircle2}
        emptyTitle={repayments.length === 0 ? emptyTitle : undefined}
        emptyDescription={repayments.length === 0 ? emptyDescription(filters) : undefined}
        pagination={
          pagination.totalPages > 1
            ? { page: filters.page, totalPages: pagination.totalPages }
            : null
        }
        onPageChange={(page) => setFilters({ ...filters, page })}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Borrower</TableHead>
              <TableHead className="text-xs">Loan account no</TableHead>
              <TableHead className="text-xs">Principal due</TableHead>
              <TableHead className="text-xs text-red-600">Penalty</TableHead>
              <TableHead className="text-xs">DPD status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repayments.map((r, i) => (
              <TableRow key={r.repayment_id || i}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      {r.borrower_name}
                      {r.is_visit_required && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-[10px] text-red-700 border border-red-100">
                          <MapPin className="w-2.5 h-2.5" />
                          Visit
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {r.contact_number || r.email}
                    </p>
                    {r.credit_manager_name && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Credit Manager: {r.credit_manager_name}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-xs font-medium text-blue-700">
                    {r.loan_account_number || r.application_number}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Due {r.due_date ? format(new Date(r.due_date), 'dd MMM yyyy') : 'N/A'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {r.loan_level || r.emi_count
                      ? `${r.emi_count || 1} EMI(s)`
                      : `EMI #${r.emi_number}`}
                  </p>
                </TableCell>
                <TableCell className="text-sm font-medium tabular-nums">
                  <p>{formatInr(r.unpaidBeforeFine ?? r.principal_due)}</p>
                  {Number(r.partPaid) > 0 && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Contract {formatInr(r.contractDue ?? r.principal_due)}
                      {' · '}
                      Part paid {formatInr(r.partPaid)}
                      {r.partPaidOn ? ` on ${format(new Date(`${String(r.partPaidOn).slice(0, 10)}T00:00:00`), 'dd MMM yyyy')}` : ''}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium tabular-nums text-red-600">
                    +{formatInr(r.calculated_penalty)}
                  </p>
                  <p className="text-[10px] text-slate-400">2% per day on the unpaid balance</p>
                  {Array.isArray(r.penaltySteps) && r.penaltySteps.length > 1 && (
                    <p className="text-[10px] text-slate-500">
                      {r.penaltySteps
                        .map((step) => `${step.days}d on ${formatInr(step.balance)}`)
                        .join(', then ')}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 tabular-nums">
                    Total {formatInr(r.total_due_with_penalty)}
                  </p>
                </TableCell>
                <TableCell>
                  {r?.days_overdue !== undefined ? <DpdStatusBadge repayment={r} /> : '—'}
                  {(r.followup_status || r.last_disposition) && (
                    <p className="text-[10px] text-slate-400 mt-1 capitalize">
                      {(r.last_disposition || r.followup_status || '').replace(/_/g, ' ')}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View contact"
                      onClick={() => onViewContact(r.user_id)}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View late charges"
                      onClick={() => onViewPenalty(r)}
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Call disposition"
                      onClick={() => onAddRemark(r)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Record collection"
                      onClick={() => onCollect?.(r)}
                      disabled={!r.loan_application_id}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Account 360"
                      onClick={() => navigate(account360Path(r.loan_account_number || r.application_number))}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View remarks"
                      onClick={() => onViewRemarks(r.loan_application_id)}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollectionDataTable>
    </div>
  );
}
