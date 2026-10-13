'use client';

import { useState } from 'react';
import { BadgeCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { EMPTY, btnSecondary, btnSuccess } from '../common/DetailTable';
import { validateProfileContactUniqueness } from '@/lib/utils/mobile';
import { pickSelfieDisplayUrl } from '@/lib/utils/media';
import { getOptimizedUrl } from '@/lib/services/cloudinaryUpload';

const formatDate = (value) => {
  if (!value) return EMPTY;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? EMPTY
    : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatCurrency = (value) => {
  if (value == null || value === '') return EMPTY;
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

function Fact({ label, children }) {
  return (
    <div className="min-w-[8.5rem] flex-1 basis-[8.5rem]">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <div className="mt-0.5 text-[13px] font-semibold text-slate-900 break-words">{children}</div>
    </div>
  );
}

export default function CustomerIdentityStrip() {
  const {
    userData,
    selfie,
    admin,
    references,
    isReadOnly,
    updating,
    handleUpdatePrimaryMobile,
    editingSalaryDate,
    setEditingSalaryDate,
    newSalaryDate,
    setNewSalaryDate,
    handleUpdateSalaryDate,
  } = useApplicationContext();

  const [editingPrimaryMobile, setEditingPrimaryMobile] = useState(false);
  const [primaryMobileDraft, setPrimaryMobileDraft] = useState('');
  const [primaryMobileError, setPrimaryMobileError] = useState('');

  const profile = userData?.profile || {};
  const selfieSrc = getOptimizedUrl(pickSelfieDisplayUrl({ selfie }), { width: 320 });
  const name = profile.full_name || userData?.full_name || EMPTY;
  const primaryMobile = String(profile.mobile || userData?.mobile || '').replace(/\D/g, '');
  const alternateMobile = String(profile.alternate_mobile || '').replace(/\D/g, '');
  const email = profile.personal_email || userData?.email;
  const emailVerified = profile.personal_email_verified || userData?.personal_email_verified;
  const pan = profile.pancard || userData?.pancard;
  const gender = profile.gender
    ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
    : EMPTY;

  return (
    <section className="rounded-md border border-zinc-800 bg-white overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        {selfieSrc ? (
          <button
            type="button"
            className="shrink-0 h-20 w-20 rounded-md overflow-hidden border border-slate-200 bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            onClick={() => window.open(selfieSrc, '_blank', 'noopener,noreferrer')}
            title="Open photo"
          >
            <img src={selfieSrc} alt="Customer photo" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="shrink-0 h-20 w-20 rounded-md border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-1">
            <span className="text-[11px] font-medium text-slate-500 leading-tight">No photo</span>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-base font-semibold text-slate-900 leading-tight break-words">{name}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Fact label="Mobile number">
              {editingPrimaryMobile ? (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Input
                      value={primaryMobileDraft}
                      onChange={(e) => {
                        setPrimaryMobileDraft(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setPrimaryMobileError('');
                      }}
                      className="h-8 w-32 text-[12px] font-mono"
                      placeholder="10-digit mobile"
                      maxLength={10}
                    />
                    <Button
                      size="sm"
                      className={btnSuccess}
                      disabled={updating || primaryMobileDraft.length !== 10}
                      onClick={async () => {
                        const localErr = validateProfileContactUniqueness({
                          candidate: primaryMobileDraft,
                          role: 'primary',
                          primaryMobile,
                          alternateMobile,
                          references,
                        });
                        if (localErr) {
                          setPrimaryMobileError(localErr);
                          return;
                        }
                        const result = await handleUpdatePrimaryMobile(primaryMobileDraft);
                        if (result?.ok) {
                          setEditingPrimaryMobile(false);
                          setPrimaryMobileError('');
                        } else if (result?.message) {
                          setPrimaryMobileError(result.message);
                        }
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => {
                        setEditingPrimaryMobile(false);
                        setPrimaryMobileError('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  {primaryMobileError ? (
                    <p className="text-[11px] text-rose-600 font-medium">{primaryMobileError}</p>
                  ) : null}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono">{primaryMobile || EMPTY}</span>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      className={btnSecondary}
                      onClick={() => {
                        setPrimaryMobileDraft(primaryMobile || '');
                        setPrimaryMobileError('');
                        setEditingPrimaryMobile(true);
                      }}
                    >
                      {primaryMobile ? 'Edit' : 'Add'}
                    </Button>
                  )}
                </span>
              )}
            </Fact>
            <Fact label="Email">
              <span className="inline-flex items-center gap-1 min-w-0">
                <span className="truncate">{email || EMPTY}</span>
                {emailVerified ? <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : null}
              </span>
            </Fact>
            <Fact label="PAN card">
              <span className="inline-flex items-center gap-1 font-mono">
                <span>{pan || EMPTY}</span>
                {profile.pancard_verified ? (
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : null}
              </span>
            </Fact>
            <Fact label="Date of birth">{formatDate(profile.dob)}</Fact>
            <Fact label="Gender">{gender}</Fact>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-3 py-2 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Monthly salary</p>
          <p className="text-lg font-semibold text-slate-900 tabular-nums leading-tight">
            {formatCurrency(profile.net_monthly_income)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-500">Next salary date</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold text-slate-900">{formatDate(profile.next_salary_date)}</span>
            {admin?.role === 'super_admin' && (
              editingSalaryDate ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    className="h-8 text-[12px] font-semibold w-36 rounded-md border-slate-300 bg-white px-2"
                    value={newSalaryDate}
                    onChange={(e) => setNewSalaryDate(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className={btnSuccess}
                    onClick={handleUpdateSalaryDate}
                    disabled={updating}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className={btnSecondary}
                  onClick={() => {
                    setEditingSalaryDate(true);
                    setNewSalaryDate(
                      profile.next_salary_date
                        ? new Date(profile.next_salary_date).toISOString().split('T')[0]
                        : ''
                    );
                  }}
                >
                  Edit
                </Button>
              )
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">Company</p>
          <p className="text-[13px] font-semibold text-slate-900 break-words">{profile.company_name || EMPTY}</p>
        </div>
      </div>
    </section>
  );
}
