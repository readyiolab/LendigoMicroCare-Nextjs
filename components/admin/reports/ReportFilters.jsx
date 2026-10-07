import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { productAPI } from '@/lib/api/roles';
import { formatStatusLabel } from '@/utils/statusUtils';

const STATUS_OPTIONS = [
  'draft', 'submitted', 'under_review', 'pending_eligibility', 'pending_pd', 'recommended',
  'approved', 'rejected', 'offer_sent', 'offer_accepted', 'offer_rejected',
  'video_declaration_pending', 'video_declaration_submitted', 'esign_pending',
  'esign_completed', 'mandate_pending', 'payment_pending', 'disbursed',
];

const fieldClass = 'h-9 rounded-md border border-slate-200 bg-white px-3 text-[13px]';

function Labeled({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function ReportFilters({
  filters,
  onApply,
  cities = [],
  creditManagers = [],
  telecallers = [],
  underwriters = [],
  opsManagers = [],
}) {
  const [draft, setDraft] = useState(filters);
  const [more, setMore] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    productAPI.getProducts({ all: true, slim: true }).then((res) => {
      if (cancelled || res?.status !== 1) return;
      const list = res.data?.products || res.data || [];
      setProducts(Array.isArray(list) ? list : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const set = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <form
      className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Labeled label="From">
          <Input type="date" value={draft.from || ''} onChange={set('from')} className="h-9 text-[13px]" />
        </Labeled>
        <Labeled label="To">
          <Input type="date" value={draft.to || ''} onChange={set('to')} className="h-9 text-[13px]" />
        </Labeled>
        <Labeled label="Status">
          <select value={draft.applicationStatus || ''} onChange={set('applicationStatus')} className={fieldClass}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{formatStatusLabel(status)}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="City">
          <select value={draft.city || ''} onChange={set('city')} className={fieldClass}>
            <option value="">All cities</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </Labeled>
        <Labeled label="Loan product">
          <select value={draft.productId || ''} onChange={set('productId')} className={fieldClass}>
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.product_name || product.name}</option>
            ))}
          </select>
        </Labeled>
        {creditManagers.length > 0 && (
          <Labeled label="Credit manager">
            <select value={draft.creditManagerId || ''} onChange={set('creditManagerId')} className={fieldClass}>
              <option value="">All credit managers</option>
              {creditManagers.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
          </Labeled>
        )}
        {telecallers.length > 0 && (
          <Labeled label="Telecaller">
            <select value={draft.telecallerId || ''} onChange={set('telecallerId')} className={fieldClass}>
              <option value="">All telecallers</option>
              {telecallers.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
          </Labeled>
        )}
        {underwriters.length > 0 && (
          <Labeled label="Underwriter">
            <select value={draft.underwriterId || ''} onChange={set('underwriterId')} className={fieldClass}>
              <option value="">All underwriters</option>
              {underwriters.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
          </Labeled>
        )}
        {opsManagers.length > 0 && (
          <Labeled label="Operations">
            <select value={draft.opsManagerId || ''} onChange={set('opsManagerId')} className={fieldClass}>
              <option value="">All operations</option>
              {opsManagers.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
          </Labeled>
        )}
      </div>

      {more && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Labeled label="Customer ID">
            <Input
              placeholder="CUS000001"
              value={draft.customerId || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, customerId: e.target.value.toUpperCase() }))}
              className="h-9 text-[13px]"
            />
          </Labeled>
          <Labeled label="Assignment">
            <select value={draft.assignmentStatus || 'all'} onChange={set('assignmentStatus')} className={fieldClass}>
              <option value="all">All</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </Labeled>
          <Labeled label="Verification">
            <select value={draft.verificationStatus || ''} onChange={set('verificationStatus')} className={fieldClass}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>
          </Labeled>
          <Labeled label="Offer">
            <select value={draft.offerStatus || ''} onChange={set('offerStatus')} className={fieldClass}>
              <option value="">All</option>
              <option value="offer_sent">Offer sent</option>
              <option value="offer_accepted">Offer accepted</option>
              <option value="offer_rejected">Offer rejected</option>
            </select>
          </Labeled>
          <Labeled label="Disbursal">
            <select value={draft.disbursalStatus || ''} onChange={set('disbursalStatus')} className={fieldClass}>
              <option value="">All</option>
              <option value="payment_pending">Pending</option>
              <option value="disbursed">Disbursed</option>
            </select>
          </Labeled>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" className="h-9">Apply</Button>
        <button type="button" className="text-[12px] font-semibold text-slate-600 px-2" onClick={() => setMore((open) => !open)}>
          {more ? 'Hide extra filters' : 'More filters'}
        </button>
      </div>
    </form>
  );
}
