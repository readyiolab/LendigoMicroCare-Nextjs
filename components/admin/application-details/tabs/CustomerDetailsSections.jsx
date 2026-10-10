import { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  CheckCircle2,
  BadgeCheck,
  Play,
  Volume2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import {
  DetailTable,
  DetailRow,
  EMPTY,
  btnPrimary,
  btnSecondary,
  btnSuccess,
} from '../common/DetailTable';
import { validateProfileContactUniqueness } from '@/lib/utils/mobile';
import { isStrictEmail } from '@/lib/apiErrorMessage';
import CallRecordingPlayer from '@/components/admin/CallRecordingPlayer';
import {
  CALL_RECORDING_ACCEPT,
  isAllowedRecordingFile,
  normalizeRecordingFile,
} from '@/lib/utils/callRecording';
import { formatKycAddress } from '@/lib/utils/formatKycAddress';
import { pickSelfieDisplayUrl } from '@/lib/utils/media';
import { getOptimizedUrl } from '@/lib/services/cloudinaryUpload';

const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return EMPTY;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? EMPTY : parsed.toLocaleDateString('en-IN', options);
};

const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  return numeric > 0 ? `₹${numeric.toLocaleString('en-IN')}` : EMPTY;
};

function ValueWithBadge({ value, verified }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="truncate font-bold">{value || EMPTY}</span>
      {verified ? <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : null}
    </span>
  );
}

/** Customer profile cards + references, rendered inside the Overview tab. */
export default function CustomerDetailsSections() {
  const {
    userData,
    loanApp,
    selfie,
    references,
    admin,
    data,
    kyc_details,
    editingSalaryDate,
    setEditingSalaryDate,
    newSalaryDate,
    setNewSalaryDate,
    handleUpdateSalaryDate,
    updating,
    sendingOfficeOTP,
    verifyingOfficeOTP,
    officeOTPStep,
    setOfficeOTPStep,
    officeOTP,
    setOfficeOTP,
    handleSendOfficeOTP,
    handleVerifyOfficeOTP,
    handleVerifyReference,
    handleAddApplicationReference,
    handleUpdateApplicationReference,
    handleDeleteApplicationReference,
    handleLookupReferenceMobileName,
    handleUpdateApplicantProfile,
    handleUpdatePrimaryMobile,
    isReadOnly,
  } = useApplicationContext();

  const role = String(admin?.role_code || admin?.role || '').toLowerCase();
  const canVerifyRefs = ['credit_manager', 'underwriter', 'approver', 'super_admin', 'admin'].includes(role);
  const status = String(loanApp?.application_status || '').toLowerCase();
  const caseFinished = ['disbursed', 'closed', 'defaulted', 'rejected', 'offer_rejected'].includes(status);
  const canEditRefs = (role === 'super_admin' || role === 'admin')
    ? !caseFinished
    : canVerifyRefs && !isReadOnly;
  const profile = userData?.profile || {};
  const officeEmailVerified = Number(profile.office_email_verified) === 1;
  const [officeEmailInput, setOfficeEmailInput] = useState(profile.office_email || '');
  const [officeEmailError, setOfficeEmailError] = useState('');
  const [refVerifyOpen, setRefVerifyOpen] = useState(false);
  const [refVerifyTarget, setRefVerifyTarget] = useState(null);
  const [refVerifyStatus, setRefVerifyStatus] = useState('verified');
  const [refVerifyRemarks, setRefVerifyRemarks] = useState('');
  const [refRecordingFile, setRefRecordingFile] = useState(null);
  const [refRecordingError, setRefRecordingError] = useState('');
  const [refRecordingPreviewUrl, setRefRecordingPreviewUrl] = useState(null);
  const [refUploadProgress, setRefUploadProgress] = useState(null);
  const [refFormOpen, setRefFormOpen] = useState(false);
  const [nameLookupId, setNameLookupId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [refForm, setRefForm] = useState({
    id: null,
    reference_name: '',
    reference_mobile: '',
    relationship: '',
    reference_email: '',
  });
  const [refFormError, setRefFormError] = useState('');
  const [altMobileError, setAltMobileError] = useState('');
  const fileInputRef = useRef(null);
  const [currentAddressDraft, setCurrentAddressDraft] = useState('');
  const [editingCurrentAddress, setEditingCurrentAddress] = useState(false);
  const [officeAddressDraft, setOfficeAddressDraft] = useState('');
  const [editingOfficeAddress, setEditingOfficeAddress] = useState(false);
  const [altMobileDraft, setAltMobileDraft] = useState('');
  const [editingAltMobile, setEditingAltMobile] = useState(false);
  const [primaryMobileDraft, setPrimaryMobileDraft] = useState('');
  const [editingPrimaryMobile, setEditingPrimaryMobile] = useState(false);
  const [primaryMobileError, setPrimaryMobileError] = useState('');

  useEffect(() => {
    if (!refRecordingFile) {
      setRefRecordingPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(refRecordingFile);
    setRefRecordingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [refRecordingFile]);

  const employmentType = (profile.employment_type || EMPTY).replace(/_/g, ' ');
  const permanentAddress =
    data?.kyc_details?.aadhaar_address ||
    kyc_details?.aadhaar_address ||
    profile.address ||
    null;
  const currentAddress = profile.current_address || null;
  const officeAddress = profile.office_address || null;
  const primaryMobile = userData?.mobile || profile.mobile || '';
  const alternateMobile = profile.alternate_mobile || '';
  const selfieSrc = getOptimizedUrl(pickSelfieDisplayUrl({ selfie }), { width: 320 });
  const customerCode =
    profile.customer_code || userData?.customer_code || loanApp?.customer_code || data?.profile?.customer_code;

  const openRefVerify = (ref, status) => {
    setRefVerifyTarget(ref);
    setRefVerifyStatus(status);
    setRefVerifyRemarks('');
    setRefRecordingFile(null);
    setRefRecordingError('');
    setRefUploadProgress(null);
    setRefVerifyOpen(true);
  };

  const closeRefVerify = () => {
    setRefVerifyOpen(false);
    setRefVerifyTarget(null);
    setRefVerifyRemarks('');
    setRefRecordingFile(null);
    setRefRecordingError('');
    setRefUploadProgress(null);
  };

  const submitRefVerify = async () => {
    if (!refVerifyTarget?.id) return;
    const result = await handleVerifyReference(
      refVerifyTarget.id,
      refVerifyStatus,
      refVerifyRemarks,
      refRecordingFile,
      { onUploadProgress: setRefUploadProgress }
    );
    if (result?.ok) closeRefVerify();
  };
  const fields = [
    profile.full_name,
    profile.mobile,
    profile.personal_email,
    profile.pancard,
    profile.dob,
    profile.company_name,
    profile.net_monthly_income,
  ];
  const filledCount = fields.filter(Boolean).length;
  const completionPct = Math.round((filledCount / fields.length) * 100);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <DetailTable title="Personal">
          <DetailRow label="Photo" emphasize={false}>
            {selfieSrc ? (
              <button
                type="button"
                className="block rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                onClick={() => window.open(selfieSrc, '_blank', 'noopener,noreferrer')}
                title="Open selfie"
              >
                <img src={selfieSrc} alt="Customer selfie" className="h-24 w-24 object-cover" />
              </button>
            ) : (
              <span className="text-[12px] font-medium text-slate-400 italic">Not uploaded</span>
            )}
          </DetailRow>
          <DetailRow label="Full name">{profile.full_name || userData?.full_name}</DetailRow>
          <DetailRow label="Customer ID" mono>{customerCode}</DetailRow>
          <DetailRow label="Primary mobile" emphasize={false}>
            {editingPrimaryMobile ? (
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={primaryMobileDraft}
                    onChange={(e) => {
                      setPrimaryMobileDraft(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setPrimaryMobileError('');
                    }}
                    className="h-8 w-36 text-[12px] font-mono"
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
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Login mobile used for DigiLocker / KYC. Must be a unique 10-digit Indian number.
                  </p>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="font-mono font-bold">{primaryMobile || EMPTY}</span>
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
          </DetailRow>
          <DetailRow label="Alternate mobile" emphasize={false}>
            {editingAltMobile ? (
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={altMobileDraft}
                    onChange={(e) => {
                      setAltMobileDraft(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setAltMobileError('');
                    }}
                    className="h-8 w-36 text-[12px] font-mono"
                    placeholder="10-digit mobile"
                    maxLength={10}
                  />
                  <Button
                    size="sm"
                    className={btnSuccess}
                    disabled={updating || (altMobileDraft && altMobileDraft.length !== 10)}
                    onClick={async () => {
                      const localErr = validateProfileContactUniqueness({
                        candidate: altMobileDraft,
                        role: 'alternate',
                        primaryMobile,
                        alternateMobile,
                        references,
                      });
                      if (localErr) {
                        setAltMobileError(localErr);
                        return;
                      }
                      const result = await handleUpdateApplicantProfile({
                        alternate_mobile: altMobileDraft || null,
                      });
                      if (result?.ok) {
                        setEditingAltMobile(false);
                        setAltMobileError('');
                      } else if (result?.message) {
                        setAltMobileError(result.message);
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
                      setEditingAltMobile(false);
                      setAltMobileError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {altMobileError ? (
                  <p className="text-[11px] text-rose-600 font-medium">{altMobileError}</p>
                ) : null}
              </div>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="font-mono font-bold">{alternateMobile || EMPTY}</span>
                {!isReadOnly && (
                  <Button
                    type="button"
                    size="sm"
                    className={btnSecondary}
                    onClick={() => {
                      setAltMobileDraft(alternateMobile || '');
                      setAltMobileError('');
                      setEditingAltMobile(true);
                    }}
                  >
                    {alternateMobile ? 'Edit' : 'Add'}
                  </Button>
                )}
              </span>
            )}
          </DetailRow>
          <DetailRow label="Personal email" emphasize={false}>
            <ValueWithBadge
              value={profile.personal_email || userData?.email}
              verified={profile.personal_email_verified || userData?.personal_email_verified}
            />
          </DetailRow>
          <DetailRow label="Date of birth">{formatDate(profile.dob)}</DetailRow>
          <DetailRow label="Gender">
            {profile.gender
              ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
              : null}
          </DetailRow>
          <DetailRow label="PAN" mono emphasize={false}>
            <ValueWithBadge
              value={profile.pancard || userData?.pancard}
              verified={profile.pancard_verified}
            />
          </DetailRow>
          <DetailRow label="Eligibility">
            {String(profile.eligibility_status || 'pending').replace(/_/g, ' ')}
          </DetailRow>
        </DetailTable>

        <DetailTable title="Employment">
          <DetailRow label="Type">{employmentType}</DetailRow>
          <DetailRow label="Company">{profile.company_name}</DetailRow>
          <DetailRow label="Company type">{profile.company_type}</DetailRow>
          <DetailRow label="Joined">{formatDate(profile.current_job_joining_date)}</DetailRow>
          <DetailRow label="Experience">
            {profile.total_work_experience_months
              ? `${profile.total_work_experience_months} months`
              : null}
          </DetailRow>
          <DetailRow label="Office email" emphasize={false}>
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ValueWithBadge
                  value={profile.office_email || officeEmailInput || null}
                  verified={officeEmailVerified}
                />
                {!officeEmailVerified && (
                  officeOTPStep === 'otp' ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="OTP"
                        value={officeOTP}
                        onChange={(e) => {
                          setOfficeOTP(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setOfficeEmailError('');
                        }}
                        className="h-8 w-20 text-[12px] font-bold rounded-md border-slate-300 bg-white text-center"
                        maxLength={6}
                        inputMode="numeric"
                        disabled={verifyingOfficeOTP}
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          const result = await handleVerifyOfficeOTP();
                          if (result && result.ok === false && result.message) {
                            setOfficeEmailError(result.message);
                          } else {
                            setOfficeEmailError('');
                          }
                        }}
                        disabled={verifyingOfficeOTP || String(officeOTP || '').length !== 6}
                        loading={verifyingOfficeOTP}
                        className={btnPrimary}
                      >
                        Confirm
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setOfficeOTPStep('input');
                          setOfficeEmailError('');
                        }}
                        className="text-[12px] font-bold text-slate-500 hover:text-slate-800 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {!profile.office_email && (
                        <Input
                          placeholder="office@company.com"
                          type="email"
                          value={officeEmailInput}
                          onChange={(e) => {
                            setOfficeEmailInput(e.target.value);
                            setOfficeEmailError('');
                          }}
                          className="h-8 w-44 text-[12px] font-semibold rounded-md border-slate-300 bg-white px-2"
                          disabled={sendingOfficeOTP}
                        />
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className={btnSecondary}
                        onClick={async () => {
                          const candidate = profile.office_email || officeEmailInput;
                          if (!isStrictEmail(String(candidate || '').trim())) {
                            setOfficeEmailError('Please enter a valid office email address.');
                            return;
                          }
                          setOfficeEmailError('');
                          const result = await handleSendOfficeOTP(candidate);
                          if (result && result.ok === false) {
                            setOfficeEmailError(result.message || 'Failed to send OTP');
                          }
                        }}
                        disabled={sendingOfficeOTP || (!profile.office_email && !officeEmailInput)}
                        loading={sendingOfficeOTP}
                      >
                        Verify
                      </Button>
                    </div>
                  )
                )}
              </div>
              {(sendingOfficeOTP || verifyingOfficeOTP) && (
                <p className="text-[11px] font-semibold text-slate-500">
                  {sendingOfficeOTP ? 'Sending office email verification code…' : 'Verifying office email…'}
                </p>
              )}
              {officeEmailError ? (
                <p className="text-[11px] font-semibold text-red-600">{officeEmailError}</p>
              ) : null}
            </div>
          </DetailRow>
        </DetailTable>

        <DetailTable
          title="Financial"
          action={
            profile.salary_mode ? (
              <span className="text-[11px] font-bold text-[#222222] uppercase tracking-wide">
                {profile.salary_mode}
              </span>
            ) : null
          }
        >
          <DetailRow label="Monthly income" mono>{formatCurrency(profile.net_monthly_income)}</DetailRow>
          <DetailRow label="Max loan eligibility" mono>{formatCurrency(profile.max_loan_amount)}</DetailRow>
          <DetailRow label="Max tenure">
            {profile.max_tenure_days ? `${profile.max_tenure_days} days` : null}
          </DetailRow>
          <DetailRow label="Next salary date" emphasize={false}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{formatDate(profile.next_salary_date)}</span>
              {admin?.role === 'super_admin' && (
                editingSalaryDate ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      className="h-8 text-[12px] font-semibold w-40 rounded-md border-slate-300 bg-white px-2"
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
          </DetailRow>
          <DetailRow label="User type">{profile.user_type || 'standard'}</DetailRow>
          <DetailRow label="Profile completion" mono>
            {`${profile.profile_completion_percent ?? completionPct}%`}
          </DetailRow>
        </DetailTable>

        <DetailTable title="Address">
          <DetailRow label="Permanent (from KYC)">
            <span className="block min-w-0 break-words whitespace-normal">
              {formatKycAddress(permanentAddress) || EMPTY}
            </span>
          </DetailRow>
          <DetailRow label="Current address" emphasize={false}>
            {editingCurrentAddress ? (
              <div className="flex flex-col gap-2 w-full min-w-0">
                <Textarea
                  value={currentAddressDraft}
                  onChange={(e) => setCurrentAddressDraft(e.target.value)}
                  className="min-h-[72px] text-[12px]"
                  placeholder="Enter current address"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className={btnSuccess}
                    disabled={updating}
                    onClick={async () => {
                      const result = await handleUpdateApplicantProfile({
                        current_address: currentAddressDraft.trim() || null,
                      });
                      if (result?.ok) setEditingCurrentAddress(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    onClick={() => setEditingCurrentAddress(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full min-w-0">
                <span className="block min-w-0 break-words font-bold">{currentAddress || EMPTY}</span>
                {!isReadOnly && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className={btnSecondary}
                      onClick={() => {
                        setCurrentAddressDraft(currentAddress || '');
                        setEditingCurrentAddress(true);
                      }}
                    >
                      {currentAddress ? 'Edit' : 'Add'}
                    </Button>
                    {currentAddress ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-rose-200 text-rose-700"
                        disabled={updating}
                        onClick={() => handleUpdateApplicantProfile({ clear_current_address: true })}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </DetailRow>
          <DetailRow label="Office address" emphasize={false}>
            {editingOfficeAddress ? (
              <div className="flex flex-col gap-2 w-full min-w-0">
                <Textarea
                  value={officeAddressDraft}
                  onChange={(e) => setOfficeAddressDraft(e.target.value)}
                  className="min-h-[72px] text-[12px]"
                  placeholder="Enter office / business address"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className={btnSuccess}
                    disabled={updating}
                    onClick={async () => {
                      const result = await handleUpdateApplicantProfile({
                        office_address: officeAddressDraft.trim() || null,
                      });
                      if (result?.ok) setEditingOfficeAddress(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    onClick={() => setEditingOfficeAddress(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full min-w-0">
                <span className="block min-w-0 break-words font-bold">{officeAddress || EMPTY}</span>
                {!isReadOnly && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className={btnSecondary}
                      onClick={() => {
                        setOfficeAddressDraft(officeAddress || '');
                        setEditingOfficeAddress(true);
                      }}
                    >
                      {officeAddress ? 'Edit' : 'Add'}
                    </Button>
                    {officeAddress ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-rose-200 text-rose-700"
                        disabled={updating}
                        onClick={() => handleUpdateApplicantProfile({ clear_office_address: true })}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </DetailRow>
          <DetailRow label="City">{profile.city}</DetailRow>
          <DetailRow label="State">{profile.state}</DetailRow>
          <DetailRow label="Pincode" mono>{profile.pincode}</DetailRow>
          <DetailRow label="Residence since">
            {profile.residence_since_months
              ? `${profile.residence_since_months} months`
              : null}
          </DetailRow>
        </DetailTable>
      </div>

      <DetailTable
        title="References"
        action={
          <span className="inline-flex items-center gap-2">
            <span className="text-[12px] font-bold text-[#222222]">
              {(userData?.profile?.reference_verification_status || userData?.reference_verification_status || 'pending').replace(/_/g, ' ')}
              {' · '}
              {(references || []).length}
            </span>
            {canEditRefs && (
              <Button
                type="button"
                size="sm"
                className={`${btnPrimary} shrink-0`}
                onClick={() => {
                  setRefForm({
                    id: null,
                    reference_name: '',
                    reference_mobile: '',
                    relationship: '',
                    reference_email: '',
                  });
                  setRefFormOpen(true);
                }}
              >
                Add reference
              </Button>
            )}
          </span>
        }
      >
        {(references || []).length > 0 ? (
          (references || []).map((ref, idx) => (
            <DetailRow
              key={ref.id || idx}
              label={ref.reference_relationship || ref.relationship || ref.reference_type || `Reference ${idx + 1}`}
              emphasize={false}
            >
              <span className="flex flex-col gap-2 min-w-0 w-full" data-ref-row>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  {ref.reference_name}
                </span>
                <span className="font-mono text-[12.5px] font-semibold text-slate-800">
                  {ref.reference_mobile}
                </span>
                <span className={`text-[11px] font-bold uppercase ${ref.verification_status === 'verified' ? 'text-emerald-700' : ref.verification_status === 'failed' ? 'text-rose-700' : 'text-amber-700'}`}>
                  {ref.verification_status || 'pending'}
                </span>
                {Number(ref.auto_verified) === 1 && ref.verification_status === 'verified' ? (
                  <span
                    className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
                    title="Verification and call recording reused from the customer's previous loan"
                  >
                    Auto-verified
                    {ref.verification_source_lead_id ? ` from ${ref.verification_source_lead_id}` : ''}
                    {ref.verified_at && formatDate(ref.verified_at) !== EMPTY ? ` (${formatDate(ref.verified_at)})` : ''}
                  </span>
                ) : null}
                <span className="inline-flex flex-wrap items-center gap-1">
                  {ref.recording_url ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className={`${btnSecondary} shrink-0`}
                        onClick={(e) => {
                          const audio = e.currentTarget.closest('[data-ref-row]')?.querySelector('audio');
                          if (audio) {
                            audio.play().catch(() => {});
                          }
                        }}
                      >
                        <Play className="w-3 h-3 mr-1 fill-current" />
                        Play
                      </Button>
                      <a
                        href={ref.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open audio
                      </a>
                    </>
                  ) : null}
                  {canEditRefs && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className={`${btnSecondary} shrink-0`}
                        disabled={updating}
                        onClick={() => {
                          setRefForm({
                            id: ref.id,
                            reference_name: ref.reference_name || '',
                            reference_mobile: ref.reference_mobile || '',
                            relationship: ref.relationship || ref.reference_relationship || '',
                            reference_email: ref.reference_email || '',
                          });
                          setRefFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-rose-200 text-rose-700 shrink-0"
                        disabled={updating}
                        loading={deletingId === ref.id}
                        onClick={async () => {
                          setDeletingId(ref.id);
                          try {
                            await handleDeleteApplicationReference(ref.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                  {!isReadOnly && canVerifyRefs && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className={`${btnSuccess} shrink-0`}
                        disabled={updating || ref.verification_status === 'verified'}
                        onClick={() => openRefVerify(ref, 'verified')}
                      >
                        Verify
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-rose-200 text-rose-700 shrink-0"
                        disabled={updating || ref.verification_status === 'failed'}
                        onClick={() => openRefVerify(ref, 'failed')}
                      >
                        Failed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className={`${btnSecondary} shrink-0`}
                        disabled={updating}
                        loading={nameLookupId === ref.id}
                        onClick={async () => {
                          setNameLookupId(ref.id);
                          try {
                            await handleLookupReferenceMobileName(ref.id);
                          } finally {
                            setNameLookupId(null);
                          }
                        }}
                      >
                        Check name
                      </Button>
                    </>
                  )}
                </span>
              </span>
              {(ref.mobile_linked_name || ref.name_lookup_message || ref.name_lookup_at) ? (
                <span className="text-[11px] font-semibold text-slate-700">
                  Linked name: {ref.mobile_linked_name || '—'}
                  {ref.name_match === 0 || ref.name_match === 1 || ref.name_match === true || ref.name_match === false ? (
                    <> · Match: {Number(ref.name_match) === 1 ? 'true' : 'false'}</>
                  ) : null}
                  {ref.name_match_score != null && ref.name_match_score !== '' ? (
                    <> · Score: {Number(ref.name_match_score)}</>
                  ) : null}
                  {!ref.mobile_linked_name && ref.name_lookup_message ? (
                    <> · {ref.name_lookup_message}</>
                  ) : null}
                </span>
              ) : null}
              {ref.recording_url ? (
                <div className="flex items-center gap-2 pt-1">
                  <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <CallRecordingPlayer src={ref.recording_url} className="h-8 w-full max-w-md" />
                  {ref.recording_from_lead_id && ref.recording_from_lead_id !== loanApp?.lead_id ? (
                    <span className="shrink-0 text-[10px] font-semibold text-indigo-700">
                      Recording from {ref.recording_from_lead_id}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic">No recording uploaded</span>
              )}
              </span>
            </DetailRow>
          ))
        ) : (
          <DetailRow label="References">No references provided</DetailRow>
        )}
      </DetailTable>

      <Dialog
        open={refVerifyOpen}
        onOpenChange={(open) => {
          if (!open) closeRefVerify();
          else setRefVerifyOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-lg border border-slate-100 shadow-lg p-4 gap-3 overflow-x-hidden">
          <DialogHeader className="space-y-1 min-w-0">
            <DialogTitle className="text-sm font-semibold text-slate-800">
              {refVerifyStatus === 'failed' ? 'Mark reference failed' : 'Verify reference'}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-400">
              Call {refVerifyTarget?.reference_name || 'the reference'} from your mobile, then upload the recording.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 min-w-0">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] min-w-0">
              <p className="font-bold text-slate-900 truncate">{refVerifyTarget?.reference_name || '—'}</p>
              <p className="font-mono text-slate-700">{refVerifyTarget?.reference_mobile || '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Remarks</span>
              <Textarea
                placeholder="Call notes..."
                value={refVerifyRemarks}
                onChange={(e) => setRefVerifyRemarks(e.target.value)}
                className="min-h-[72px] max-h-[120px] rounded-lg border-slate-200 bg-slate-50 text-xs font-normal resize-none focus:ring-0"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                Call recording
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CALL_RECORDING_ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    e.target.value = '';
                    if (!selected) {
                      setRefRecordingFile(null);
                      setRefRecordingError('');
                      return;
                    }
                    if (!isAllowedRecordingFile(selected)) {
                      setRefRecordingFile(null);
                      setRefRecordingError('Please choose an audio file. MP3, M4A, WAV, OGG, AAC, AMR, 3GP, FLAC, WebM and similar formats are supported.');
                      return;
                    }
                    setRefRecordingError('');
                    setRefRecordingFile(normalizeRecordingFile(selected));
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 shrink-0 text-[11px]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updating}
                >
                  Choose file
                </Button>
                <span className="text-[11px] text-slate-500 truncate min-w-0">
                  {refRecordingFile?.name || 'No file chosen'}
                </span>
              </div>
              {refRecordingPreviewUrl ? (
                <CallRecordingPlayer
                  src={refRecordingPreviewUrl}
                  className="w-full max-w-full h-9"
                />
              ) : (
                <p className="text-[10px] text-slate-400">
                  Record on your phone, then upload any audio format here (MP3, M4A, WAV, OGG, AAC, AMR, 3GP, FLAC, WebM, and more).
                </p>
              )}
              {refRecordingError ? (
                <p className="text-[11px] font-semibold text-red-600">{refRecordingError}</p>
              ) : null}
              {typeof refUploadProgress === 'number' ? (
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, refUploadProgress))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Uploading… {Math.round(refUploadProgress)}%</p>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="mt-1 gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeRefVerify}
              className="rounded-lg text-slate-500 text-xs h-8 px-3"
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitRefVerify}
              disabled={updating}
              loading={updating}
              className={`rounded-lg text-xs px-4 h-8 text-white ${
                refVerifyStatus === 'failed'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {refVerifyStatus === 'failed' ? 'Mark failed' : 'Verify reference'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={refFormOpen}
        onOpenChange={(open) => {
          setRefFormOpen(open);
          if (!open) setRefFormError('');
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-lg border border-slate-100 shadow-lg p-4 gap-3 overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-800">
              {refForm.id ? 'Edit reference' : 'Add reference'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 min-w-0">
            <Input
              placeholder="Full name"
              value={refForm.reference_name}
              onChange={(e) => setRefForm((p) => ({ ...p, reference_name: e.target.value }))}
              className="h-9 text-xs"
            />
            <div className="space-y-1">
              <Input
                placeholder="10-digit mobile"
                value={refForm.reference_mobile}
                onChange={(e) => {
                  setRefFormError('');
                  setRefForm((p) => ({
                    ...p,
                    reference_mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
                  }));
                }}
                className="h-9 text-xs font-mono"
                maxLength={10}
              />
              {refFormError ? (
                <p className="text-[11px] text-rose-600 font-medium">{refFormError}</p>
              ) : null}
            </div>
            <Input
              placeholder="Relationship (e.g. Friend, Colleague)"
              value={refForm.relationship}
              onChange={(e) => setRefForm((p) => ({ ...p, relationship: e.target.value }))}
              className="h-9 text-xs"
            />
            <Input
              placeholder="Email (optional)"
              value={refForm.reference_email}
              onChange={(e) => setRefForm((p) => ({ ...p, reference_email: e.target.value }))}
              className="h-9 text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="h-8 text-xs" onClick={() => setRefFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-8 text-xs"
              disabled={
                updating ||
                !refForm.reference_name.trim() ||
                String(refForm.reference_mobile).replace(/\D/g, '').length !== 10
              }
              loading={updating}
              onClick={async () => {
                const localErr = validateProfileContactUniqueness({
                  candidate: refForm.reference_mobile,
                  role: 'reference',
                  primaryMobile,
                  alternateMobile,
                  references,
                  excludeReferenceId: refForm.id,
                });
                if (localErr) {
                  setRefFormError(localErr);
                  return;
                }
                const payload = {
                  reference_name: refForm.reference_name.trim(),
                  reference_mobile: refForm.reference_mobile,
                  relationship: refForm.relationship || null,
                  reference_email: refForm.reference_email || null,
                };
                const result = refForm.id
                  ? await handleUpdateApplicationReference(refForm.id, payload)
                  : await handleAddApplicationReference(payload);
                if (result?.ok) {
                  setRefFormOpen(false);
                  setRefFormError('');
                } else if (result?.message) {
                  setRefFormError(result.message);
                }
              }}
            >
              {refForm.id ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
