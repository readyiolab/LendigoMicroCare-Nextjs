import React from 'react';
import {
  X,
  Users,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Send,
  Clock,
  MessageSquare,
  TrendingUp,
  Plus,
  AlertTriangle,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const REMARK_TYPES = [
  { value: 'general', label: 'Contacted / Normal chat' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'promise_to_pay', label: 'Promise to pay (creates PTP)' },
  { value: 'dispute', label: 'Dispute / Customer problem' },
  { value: 'escalation', label: 'Escalate / Legal' },
  { value: 'visit', label: 'Field visit required' },
  { value: 'payment_received', label: 'Payment confirmed' },
];

function ModalOverlay({ children, onClose, size = 'md' }) {
  const maxW = size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn('animate-in zoom-in-95 duration-200 w-full', maxW)}
      >
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider block">{label}</span>
        <span className="text-xs font-medium text-slate-800 break-words">{value}</span>
      </div>
    </div>
  );
}

function ModalHeader({ icon: Icon, title, subtitle, onClose, iconClass = 'bg-slate-900' }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn('p-2 rounded-lg text-white shrink-0', iconClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ContactModal({ contact, onClose }) {
  if (!contact) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
        <ModalHeader
          icon={Users}
          title="Borrower Contact"
          subtitle={contact.loading ? 'Loading…' : contact.applicationNumber || 'Contact details'}
          onClose={onClose}
        />

        {contact.loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Spinner className="w-6 h-6" />
            <p className="text-xs text-slate-500">Loading contact…</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <InfoRow icon={Users} label="Full Name" value={contact.fullName || 'N/A'} />
              <InfoRow
                icon={Phone}
                label="Primary Phone"
                value={
                  contact.primaryMobile ? (
                    <a href={`tel:${contact.primaryMobile}`} className="text-blue-600 hover:underline">
                      {contact.primaryMobile}
                    </a>
                  ) : (
                    'N/A'
                  )
                }
              />
              <InfoRow icon={Phone} label="Alternate" value={contact.alternatePhone || 'N/A'} />
              <InfoRow icon={Mail} label="Email" value={contact.email || 'N/A'} />
              <div className="sm:col-span-2">
                <InfoRow icon={MapPin} label="Address" value={contact.currentAddress || 'N/A'} />
              </div>
              <InfoRow
                icon={MapPin}
                label="City / State / PIN"
                value={[contact.city, contact.state, contact.pincode].filter(Boolean).join(' / ') || 'N/A'}
              />
              <InfoRow icon={Users} label="Employer" value={contact.employerName || 'N/A'} />
            </div>

            {contact.references?.length > 0 && (
              <div className="px-4 pb-3 border-t border-slate-100 pt-2">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">References</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {contact.references.map((ref, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-slate-800 truncate">{ref.name}</span>
                        <span className="text-[9px] text-slate-500 uppercase shrink-0">{ref.relation}</span>
                      </div>
                      {ref.mobile && (
                        <a href={`tel:${ref.mobile}`} className="text-[11px] text-blue-600 font-semibold mt-0.5 inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {ref.mobile}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalOverlay>
  );
}

export function PenaltyModal({ penalty, onClose }) {
  if (!penalty) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
        <ModalHeader
          icon={AlertTriangle}
          title="Overdue Payment"
          subtitle={penalty.loading ? 'Loading…' : 'Amount due including late charges'}
          onClose={onClose}
          iconClass="bg-red-600"
        />
        {penalty.loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Spinner className="w-6 h-6" />
            <p className="text-xs text-slate-500">Loading late charges…</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-1">
              <InfoRow icon={Clock} label="Loan #" value={penalty.applicationNumber || 'N/A'} />
              <InfoRow
                icon={Calendar}
                label="Due Date"
                value={penalty.dueDate ? format(new Date(penalty.dueDate), 'dd MMM yyyy') : 'N/A'}
              />
              <InfoRow
                icon={Clock}
                label="Status"
                value={
                  penalty.collectionStage === 'pre_due'
                    ? `Due in ${penalty.daysUntilDue || 0}d`
                    : penalty.collectionStage === 'due_today'
                      ? 'Due today'
                      : `${penalty.daysOverdue || 0} day(s) late`
                }
              />
              <InfoRow icon={IndianRupee} label="Contract due" value={`₹${parseFloat(penalty.contractDue ?? penalty.principalAmount ?? 0).toLocaleString('en-IN')}`} />
              {Number(penalty.partPaid) > 0 && (
                <InfoRow icon={IndianRupee} label="Part paid" value={`₹${parseFloat(penalty.partPaid).toLocaleString('en-IN')}`} />
              )}
              <InfoRow icon={IndianRupee} label="Unpaid before fine" value={`₹${parseFloat(penalty.unpaidBeforeFine ?? penalty.principalAmount ?? 0).toLocaleString('en-IN')}`} />
              <InfoRow icon={IndianRupee} label="Late charges" value={`₹${parseFloat(penalty.totalPenalty || 0).toLocaleString('en-IN')}`} />
              <InfoRow icon={TrendingUp} label="Rate" value={penalty.fineNote || penalty.penaltyRate || '2% per day on the unpaid balance'} />
            </div>
            {Array.isArray(penalty.penaltySteps) && penalty.penaltySteps.length > 0 && (
              <p className="px-4 pb-2 text-[11px] text-slate-500">
                {penalty.penaltySteps
                  .map((step) => `${step.days} day${Number(step.days) === 1 ? '' : 's'} on ₹${Number(step.balance).toLocaleString('en-IN')}`)
                  .join(', then ')}
              </p>
            )}
            <div className="mx-4 mb-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-center">
              <p className="text-[9px] uppercase tracking-wider text-red-500 font-medium">Total to collect</p>
              <p className="text-xl font-bold text-red-700">₹{parseFloat(penalty.totalDue || 0).toLocaleString('en-IN')}</p>
            </div>
          </>
        )}
      </div>
    </ModalOverlay>
  );
}

export function AddRemarkModal({ remarkModal, remarkForm, setRemarkForm, onSubmit, submitting, onClose }) {
  if (!remarkModal) return null;
  const isPtp = remarkForm.remarkType === 'promise_to_pay';
  const isVisit = remarkForm.remarkType === 'visit';
  return (
    <ModalOverlay onClose={onClose} size="lg">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
        <ModalHeader icon={Plus} title="Call disposition" subtitle="Outcome + follow-up in one step" onClose={onClose} />
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
            <span className="font-semibold">{remarkModal.borrower_name}</span>
            <span className="text-slate-400 mx-1">·</span>
            <span className="font-mono text-blue-600">{remarkModal.application_number}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Outcome</label>
              <select
                value={remarkForm.remarkType}
                onChange={(e) => setRemarkForm({ ...remarkForm, remarkType: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium bg-white"
              >
                {REMARK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
                {isPtp ? 'Promise date' : 'Next follow-up'}
              </label>
              <Input
                type="date"
                value={remarkForm.nextFollowUpDate}
                onChange={(e) => setRemarkForm({ ...remarkForm, nextFollowUpDate: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>
          {isPtp && (
            <div>
              <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Promise amount (₹)</label>
              <Input
                type="number"
                min={1}
                value={remarkForm.promiseAmount || ''}
                onChange={(e) => setRemarkForm({ ...remarkForm, promiseAmount: e.target.value })}
                className="mt-1 h-9 text-xs"
                placeholder="Amount customer promised"
              />
            </div>
          )}
          {isVisit && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
              This will flag the loan for field visit and set follow-up status.
            </p>
          )}
          <div>
            <label className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Note</label>
            <textarea
              value={remarkForm.remark}
              onChange={(e) => setRemarkForm({ ...remarkForm, remark: e.target.value })}
              placeholder="What was discussed?"
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-xs resize-none"
            />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={
              submitting ||
              !remarkForm.remark.trim() ||
              (isPtp && (!remarkForm.nextFollowUpDate || !remarkForm.promiseAmount))
            }
            className="gap-1.5"
          >
            {submitting ? <Spinner className="w-3 h-3" /> : <Send className="w-3 h-3" />}
            Save disposition
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export function ViewRemarksModal({ remarksData, onClose }) {
  if (!remarksData) return null;
  return (
    <ModalOverlay onClose={onClose} size="lg">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-h-[80vh] flex flex-col overflow-hidden">
        <ModalHeader
          icon={MessageSquare}
          title="Interaction History"
          subtitle={remarksData.loading ? 'Loading…' : 'Calls and notes'}
          onClose={onClose}
          iconClass="bg-blue-600"
        />
        <div className="overflow-y-auto px-4 py-3 space-y-2 flex-1">
          {remarksData.loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Spinner className="w-6 h-6" />
              <p className="text-xs text-slate-500">Loading history…</p>
            </div>
          ) : !remarksData.remarks?.length ? (
            <p className="text-xs text-slate-400 text-center py-8">No history yet.</p>
          ) : (
            remarksData.remarks.map((r, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] font-semibold uppercase text-slate-500">
                    {(r.remark_type || 'general').replace(/_/g, ' ')}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a') : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{r.remarks || r.remark}</p>
                {r.admin_name && (
                  <p className="text-[9px] text-slate-400 mt-1">By {r.admin_name}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
