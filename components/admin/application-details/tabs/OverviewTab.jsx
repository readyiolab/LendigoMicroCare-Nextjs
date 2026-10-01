import {
  CheckCircle2, AlertCircle,
  AlertTriangle, Play, Check, Pencil, FileText, Loader2,
} from 'lucide-react';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import VideoVerificationSection from '../common/VideoVerificationSection';
import CustomerDetailsSections from './CustomerDetailsSections';
import EditableDisbursalBankBlock, { canEditLoanBank } from '../common/EditableDisbursalBankBlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  DetailTable,
  DetailRow,
  EMPTY,
  btnPrimary,
  btnSecondary,
} from '../common/DetailTable';
import { isPanVerified } from '@/lib/utils/staffVerificationGates';
import { adminAPI } from '@/lib/api';

function StatusPill({ ok, okLabel = 'Done', pendingLabel = 'Pending' }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {okLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-700">
      <AlertCircle className="w-3.5 h-3.5" />
      {pendingLabel}
    </span>
  );
}

export default function OverviewTab() {
  const {
    loanApp,
    bankDetails,
    data,
    updating,
    isReadOnly,
    handleVideoVerification,
    handleUpdateUPIId,
    handleUpdateDisbursalBankDetails,
    userData,
    kyc_details,
    selfie,
    setActiveTab,
    admin,
  } = useApplicationContext();

  const staffRole = admin?.role_code || admin?.role;
  const showDigioButton = staffRole !== 'telecaller';
  const isDisbursed = String(loanApp?.application_status || '').toLowerCase() === 'disbursed';
  const punch = data?.disbursementPunch || {};
  const [editingUPI, setEditingUPI] = useState(false);
  const [newUPI, setNewUPI] = useState('');
  const [openingSanction, setOpeningSanction] = useState(false);
  const [sanctionError, setSanctionError] = useState('');

  const canViewSanctionLetter = [
    'collection_manager',
    'credit_manager',
    'underwriter',
    'operations',
    'operations_manager',
    'super_admin',
    'admin',
    'telecaller',
  ].includes(String(staffRole || '').toLowerCase());

  const sanctionStatuses = [
    'offer_accepted',
    'video_declaration_pending',
    'video_declaration_submitted',
    'video_declaration_rejected',
    'esign_pending',
    'esign_completed',
    'mandate_pending',
    'payment_pending',
    'disbursed',
    'closed',
    'defaulted',
    'settled',
  ];
  const showSanctionLetterBtn =
    canViewSanctionLetter &&
    sanctionStatuses.includes(String(loanApp?.application_status || '').toLowerCase());

  const handleViewSanctionLetter = async () => {
    if (!loanApp?.id) return;
    setOpeningSanction(true);
    setSanctionError('');
    try {
      const response = await adminAPI.getLoanDocument(loanApp.id, 'sanction-letter');
      const payload = response?.data ?? response;
      const blob = payload instanceof Blob ? payload : new Blob([payload], { type: 'application/pdf' });
      if (blob.type && blob.type.includes('json')) {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Failed to open sanction letter');
        } catch (parseErr) {
          if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
          throw new Error('Failed to open sanction letter');
        }
      }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setSanctionError(err?.message || err?.response?.data?.message || 'Failed to open sanction letter');
    } finally {
      setOpeningSanction(false);
    }
  };

  const panVerified = isPanVerified({ userData, panVerification: data?.pan_verification });
  const digioVerified = kyc_details?.verification_status === 'verified';
  const bankVerified = bankDetails?.is_verified === 1 || bankDetails?.penny_drop_status === 'success';
  const selfieVerified =
    selfie?.face_match_status === 'matched' && Number(selfie?.liveness_check) === 1;

  const accountDisplay =
    bankDetails?.account_number_masked ||
    (bankDetails?.account_number ? `****${String(bankDetails.account_number).slice(-4)}` : null);

  const videoUrl = data?.videoDeclaration?.video_url || loanApp.video_declaration_url;
  const videoRole = String(staffRole || '').toLowerCase();
  const canVerifyVideoRole = [
    'operations',
    'operations_manager',
    'credit_manager',
    'super_admin',
    'admin',
    'underwriter',
    'approver',
  ].includes(videoRole);
  const canVerifyVideo =
    canVerifyVideoRole &&
    ['video_declaration_submitted', 'offer_accepted'].includes(loanApp.application_status);

  return (
    <div>
      <div className="space-y-2 min-w-0">
      {loanApp.rejection_reason && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-rose-900 mb-0.5">Why it was rejected</p>
            <p className="text-[13px] font-semibold text-rose-800 leading-snug">{loanApp.rejection_reason}</p>
          </div>
        </div>
      )}

      {showSanctionLetterBtn && (
        <DetailTable title="Sanction letter">
          <DetailRow label="Document">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold"
                disabled={openingSanction}
                onClick={handleViewSanctionLetter}
              >
                {openingSanction ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                )}
                {openingSanction ? 'Opening…' : 'View sanction letter'}
              </Button>
              {sanctionError ? (
                <span className="text-[11px] text-rose-600">{sanctionError}</span>
              ) : (
                <span className="text-[11px] text-slate-500">KFS / sanction letter PDF</span>
              )}
            </div>
          </DetailRow>
        </DetailTable>
      )}

      {canVerifyVideo && (
        <DetailTable title="Customer video / Declaration">
          <tr>
            <td colSpan={2} className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                <div className="aspect-video bg-slate-900 rounded-md overflow-hidden flex items-center justify-center">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Play className="w-5 h-5" />
                      <span className="text-[12px] font-semibold">No video uploaded</span>
                    </div>
                  )}
                </div>
                <div className="relative z-20 min-h-[120px]">
                  <VideoVerificationSection
                    onVerify={handleVideoVerification}
                    updating={updating}
                    canVerify={canVerifyVideo}
                    verifiedLabel="Video verified"
                  />
                </div>
              </div>
            </td>
          </tr>
        </DetailTable>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <DetailTable
          compact
          title="Checks"
          action={
            showDigioButton ? (
              <Button type="button" size="sm" className={btnSecondary} onClick={() => setActiveTab?.('kyc')}>
                Open KYC
              </Button>
            ) : null
          }
        >
          <DetailRow label="Aadhaar" emphasize={false}><StatusPill ok={digioVerified} /></DetailRow>
          <DetailRow label="PAN" emphasize={false}><StatusPill ok={panVerified} /></DetailRow>
          <DetailRow label="Bank account" emphasize={false}><StatusPill ok={bankVerified} /></DetailRow>
          <DetailRow label="Selfie photo" emphasize={false}><StatusPill ok={selfieVerified} /></DetailRow>
        </DetailTable>

        <DetailTable
          compact
          title="Bank"
        >
          <EditableDisbursalBankBlock
            bank={bankDetails?.bank_name}
            accountNo={accountDisplay}
            ifsc={bankDetails?.ifsc_code}
            canEdit={canEditLoanBank(admin, loanApp)}
            updating={updating}
            onSave={(values) => handleUpdateDisbursalBankDetails({ ...values, viaAdmin: true })}
            labels={{ bank: 'Bank name', accountNo: 'Account' }}
          />
          <DetailRow label="Account holder">{bankDetails?.account_holder_name}</DetailRow>
          {isDisbursed && (
            <>
              <DetailRow label="Reference / UTR" mono>
                {punch.bank_reference_no || EMPTY}
              </DetailRow>
              <DetailRow label="Punched by">{punch.punched_by_name || EMPTY}</DetailRow>
              <DetailRow label="Disbursed at" mono>
                {loanApp.disbursed_at || punch.punched_at
                  ? new Date(loanApp.disbursed_at || punch.punched_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : EMPTY}
              </DetailRow>
            </>
          )}
          <DetailRow label="UPI ID" emphasize={false}>
            {editingUPI ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newUPI}
                  onChange={(e) => setNewUPI(e.target.value)}
                  className="h-8 text-[13px] font-semibold border-slate-300"
                  placeholder="UPI ID"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    await handleUpdateUPIId(newUPI);
                    setEditingUPI(false);
                  }}
                  disabled={updating}
                  className={btnPrimary}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'font-mono text-[12.5px] font-bold',
                    !bankDetails?.upi_id && 'text-slate-400 font-normal italic'
                  )}
                >
                  {bankDetails?.upi_id || EMPTY}
                </span>
                {!isReadOnly && (
                  <Button
                    type="button"
                    size="sm"
                    className={btnSecondary}
                    onClick={() => {
                      setEditingUPI(true);
                      setNewUPI(bankDetails?.upi_id || '');
                    }}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </DetailRow>
        </DetailTable>
      </div>

      <CustomerDetailsSections />
      </div>
    </div>
  );
}
