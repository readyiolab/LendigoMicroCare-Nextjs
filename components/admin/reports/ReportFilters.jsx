import { Input } from '@/components/ui/input';
import { formatStatusLabel } from '@/utils/statusUtils';

const STATUS_OPTIONS = [
  'draft', 'submitted', 'under_review', 'pending_eligibility', 'pending_pd', 'recommended',
  'approved', 'rejected', 'offer_sent', 'offer_accepted', 'offer_rejected',
  'video_declaration_pending', 'video_declaration_submitted', 'esign_pending',
  'esign_completed', 'mandate_pending', 'payment_pending', 'disbursed',
];

export default function ReportFilters({
  filters,
  setFilters,
  cities = [],
  creditManagers = [],
  telecallers = [],
  underwriters = [],
  opsManagers = [],
}) {
  const set = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <Input
        placeholder="Customer ID"
        value={filters.customerId || ''}
        onChange={(e) => setFilters((prev) => ({ ...prev, customerId: e.target.value.toUpperCase() }))}
        className="h-9 text-[13px]"
      />
      <select value={filters.city || ''} onChange={set('city')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
        <option value="">All cities</option>
        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
      </select>
      <select value={filters.applicationStatus || ''} onChange={set('applicationStatus')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{formatStatusLabel(status)}</option>)}
      </select>
      <select value={filters.assignmentStatus === 'all' || !filters.assignmentStatus ? 'all' : filters.assignmentStatus} onChange={set('assignmentStatus')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
        <option value="all">Assignment: all</option>
        <option value="assigned">Assigned</option>
        <option value="unassigned">Unassigned</option>
      </select>
      <select value={filters.verificationStatus || ''} onChange={set('verificationStatus')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
        <option value="">Verification: all</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="failed">Failed</option>
      </select>
      <select value={filters.offerStatus || ''} onChange={set('offerStatus')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
        <option value="">Offer: all</option>
        <option value="offer_sent">Offer sent</option>
        <option value="offer_accepted">Offer accepted</option>
        <option value="offer_rejected">Offer rejected</option>
      </select>
      <select value={filters.disbursalStatus || ''} onChange={set('disbursalStatus')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
        <option value="">Disbursal: all</option>
        <option value="payment_pending">Pending</option>
        <option value="disbursed">Disbursed</option>
      </select>
      {creditManagers.length > 0 && (
        <select value={filters.creditManagerId || ''} onChange={set('creditManagerId')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
          <option value="">All credit managers</option>
          {creditManagers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      )}
      {telecallers.length > 0 && (
        <select value={filters.telecallerId || ''} onChange={set('telecallerId')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
          <option value="">All telecallers</option>
          {telecallers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      )}
      {underwriters.length > 0 && (
        <select value={filters.underwriterId || ''} onChange={set('underwriterId')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
          <option value="">All underwriters</option>
          {underwriters.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      )}
      {opsManagers.length > 0 && (
        <select value={filters.opsManagerId || ''} onChange={set('opsManagerId')} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]">
          <option value="">All operations</option>
          {opsManagers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      )}
      <Input type="date" value={filters.from || ''} onChange={set('from')} className="h-9 text-[13px]" />
      <Input type="date" value={filters.to || ''} onChange={set('to')} className="h-9 text-[13px]" />
    </div>
  );
}
