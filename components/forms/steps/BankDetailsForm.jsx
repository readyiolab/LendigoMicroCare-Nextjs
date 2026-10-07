import { documentsAPI, utilityAPI } from '@/lib/api';
import { normalizeIfsc } from '@/lib/api/utility';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Banknote, CheckCircle2, Building, Hash, User, ArrowRight, RefreshCw, Smartphone, Landmark, AlertCircle } from 'lucide-react';
import { handleFormError } from '@/lib/utils/formErrors';
import StepLayout from './StepLayout';
import VerificationCorrectionAlert from '@/components/verification/VerificationCorrectionAlert';

export default function BankDetailsForm({ onSuccess, onClose, reapplicationData, isFastTrack, isAdminMode = false, targetUserId = null, applicationData = null }) {
  const isAssistedFill = Boolean(isAdminMode && targetUserId);
  const isReturningUser = !isAssistedFill && (reapplicationData?.isReturningUser || false);
  const previousBankDetails = !isAssistedFill ? (reapplicationData?.previousBankDetails || null) : null;
  
  const [useExistingBank, setUseExistingBank] = useState(
    !isAssistedFill && isReturningUser && !!previousBankDetails
  );

  /** DSA/telecaller fill: always editable unless they choose "Use existing bank". */
  const isFieldLocked = (fieldKey) => {
    if (isAssistedFill) return useExistingBank;
    if (useExistingBank) return true;
    const editable = workflowDetails.editableFields;
    if (
      workflowStatus &&
      Array.isArray(editable) &&
      editable.length > 0 &&
      !editable.includes(fieldKey)
    ) {
      return true;
    }
    return false;
  };
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountType: 'savings',
    upiId: '',
  });

  const [ifscData, setIfscData] = useState(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  // Workflow State
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [workflowDetails, setWorkflowDetails] = useState({});

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 1. Priority: Use data from applicationData if available
    if (applicationData?.bankDetails) {
        const bd = applicationData.bankDetails;
        const getVal = (snake, camel) => {
            if (bd[snake] !== undefined && bd[snake] !== null) return bd[snake];
            if (bd[camel] !== undefined && bd[camel] !== null) return bd[camel];
            return '';
        };
        
        setFormData({
            accountHolderName: getVal('account_holder_name', 'accountHolderName'),
            accountNumber: getVal('account_number', 'accountNumber') || getVal('account_number_masked', ''),
            confirmAccountNumber: getVal('account_number', 'accountNumber') || getVal('account_number_masked', ''),
            ifscCode: normalizeIfsc(getVal('ifsc_code', 'ifscCode')),
            accountType: getVal('account_type', 'accountType') || 'savings',
            upiId: getVal('upi_id', 'upiId'),
        });
        
        if (bd.wf_status) {
           setWorkflowStatus(bd.wf_status);
           setWorkflowDetails({
              reasonCode: bd.wf_reason_code,
              customerMessage: bd.wf_customer_message,
              retryCount: bd.wf_retry_count || 0,
              maxRetry: bd.wf_max_retry || 3,
              editableFields: bd.wf_editable_fields || []
           });
        }
        return;
    }

    // 2. Fallback: Manual fetching for non-terminal scenarios
    if (isAdminMode && targetUserId && !previousBankDetails) {
        documentsAPI.getBankDetails({ targetUserId })
            .then(res => {
                if (res.status === 1 && res.data) {
                    setFormData({
                        accountHolderName: res.data.account_holder_name || '',
                        accountNumber: res.data.account_number || '',
                        confirmAccountNumber: res.data.account_number || '',
                        ifscCode: normalizeIfsc(res.data.ifsc_code || ''),
                        accountType: res.data.account_type || 'savings',
                        upiId: res.data.upi_id || '',
                    });
                    
                    if (res.data.wf_status) {
                       setWorkflowStatus(res.data.wf_status);
                       setWorkflowDetails({
                          reasonCode: res.data.wf_reason_code,
                          customerMessage: res.data.wf_customer_message,
                          retryCount: res.data.wf_retry_count || 0,
                          maxRetry: res.data.wf_max_retry || 3,
                          editableFields: res.data.wf_editable_fields || []
                       });
                    }
                }
            })
            .catch(err => console.error('Error fetching bank details:', err));
    }
  }, [isAdminMode, targetUserId, previousBankDetails, applicationData]);

  // Prefill from existing bank details for returning users
  useEffect(() => {
    if (useExistingBank && previousBankDetails) {
      setFormData({
        accountHolderName: previousBankDetails.accountHolderName || '',
        accountNumber: previousBankDetails.accountNumber || '',
        confirmAccountNumber: previousBankDetails.accountNumber || '',
        ifscCode: normalizeIfsc(previousBankDetails.ifscCode || ''),
        accountType: previousBankDetails.accountType || 'savings',
        upiId: previousBankDetails.upiId || '',
      });
    } else if (!useExistingBank && isReturningUser) {
      setFormData({
        accountHolderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        accountType: 'savings',
        upiId: '',
      });
    }
  }, [useExistingBank, previousBankDetails, isReturningUser]);

  // Fetch IFSC details automatically
  useEffect(() => {
    const fetchIFSC = async () => {
      const code = normalizeIfsc(formData.ifscCode);
      if (code.length === 11) {
        setIfscLoading(true);
        setIfscData(null);
        try {
          const response = await utilityAPI.validateIFSC(code);
          if (response.status === 1 && response.data) {
            setIfscData(response.data);
          }
        } catch (err) {
          console.error('IFSC lookup failed:', err);
          setIfscData(null);
        } finally {
          setIfscLoading(false);
        }
      } else {
        setIfscData(null);
      }
    };

    fetchIFSC();
  }, [formData.ifscCode]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});
    setError('');

    setLoading(true);

    try {
      const payload = {
        ...formData,
        ifscCode: normalizeIfsc(formData.ifscCode),
        targetUserId,
      };
      const response = await documentsAPI.addBankDetails(payload);
      if (response.status === 1) {
        setSuccess('Bank details added successfully!');
        if (onSuccess) {
          setTimeout(() => onSuccess(), 300);
        }
      }
    } catch (err) {
      handleFormError(err, setFieldErrors, setError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepLayout
      title="Disbursal Bank Details"
      description="Account for loan disbursal"
      onClose={onClose}
      icon={Banknote}
      footer={
        <Button
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
          className="w-full h-10 text-xs font-black bg-zinc-950 hover:bg-black text-white shadow-md shadow-zinc-100 rounded-lg transition-all active:scale-[0.98] uppercase tracking-wide"
        >
          PROCEED TO VERIFICATION <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      }
    >
        {!isAssistedFill && isReturningUser && previousBankDetails && (
          <div className="mb-4 p-3.5 bg-blue-50/50 border border-blue-100/50 rounded-lg animate-in slide-in-from-top-2 duration-500">
              <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-100">
                        <Landmark className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-blue-900 tracking-tight leading-tight">Previous Bank Account Found</p>
                        <p className="text-[10px] text-blue-700/80 font-medium mt-0.5 truncate max-w-[200px]">
                            ****{previousBankDetails.accountNumber?.slice(-4)} ({previousBankDetails.bankName || 'Bank'})
                        </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className={`flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${useExistingBank ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50'}`}
                      onClick={() => setUseExistingBank(true)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Use This
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={`flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${!useExistingBank ? 'bg-zinc-950 text-white shadow-md shadow-zinc-200' : 'bg-white border-zinc-200 text-slate-500 hover:bg-zinc-50'}`}
                      onClick={() => setUseExistingBank(false)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Change Bank
                    </Button>
                  </div>
              </div>
          </div>
        )}

        {!isAssistedFill && (
          <VerificationCorrectionAlert 
             status={workflowStatus}
             reasonCode={workflowDetails.reasonCode}
             customerMessage={workflowDetails.customerMessage}
             retryCount={workflowDetails.retryCount}
             maxRetry={workflowDetails.maxRetry}
             onRetry={null}
             customActionLabel="Re-submit Bank Details"
          />
        )}

        {error && (
            <Alert variant="destructive" className="mb-2.5 py-1.5 rounded-lg border-red-100 bg-red-50/30">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <AlertDescription className="text-[10px] font-bold text-red-800 ml-1.5">{error}</AlertDescription>
            </Alert>
        )}
        {success && (
            <Alert variant="success" className="mb-2.5 py-1.5 rounded-lg bg-green-50/50 border-green-100 text-green-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <AlertDescription className="text-[10px] font-bold ml-1.5">{success}</AlertDescription>
            </Alert>
        )}

        <div className="space-y-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="accountHolderName" className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                 Account Holder Name
                 {isFieldLocked('accountHolderName') && <span className="text-amber-500 ml-1">(Locked)</span>}
              </Label>
              <div className="relative group">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-zinc-900 transition-colors" />
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) => {
                        setFormData(prev => ({ ...prev, accountHolderName: e.target.value }));
                        if (fieldErrors.accountHolderName) setFieldErrors(prev => ({ ...prev, accountHolderName: '' }));
                    }}
                    placeholder="As per bank records"
                    required
                    readOnly={isFieldLocked('accountHolderName')}
                    className={`h-9 pl-8 text-xs rounded-lg border-zinc-200 focus:ring-zinc-900 transition-all ${isFieldLocked('accountHolderName') ? "bg-zinc-50 text-zinc-600 cursor-not-allowed" : "bg-white"} ${fieldErrors.accountHolderName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
              </div>
              {fieldErrors.accountHolderName && <p className="text-red-500 text-[9px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.accountHolderName}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="accountNumber" className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                   Account Number
                   {isFieldLocked('accountNumber') && <span className="text-amber-500 ml-1">(Locked)</span>}
                </Label>
                <div className="relative group">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-zinc-900 transition-colors" />
                  <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                          setFormData(prev => ({ ...prev, accountNumber: val }));
                          if (fieldErrors.accountNumber) setFieldErrors(prev => ({ ...prev, accountNumber: '' }));
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={18}
                      placeholder="6–18 digits"
                      required
                      readOnly={isFieldLocked('accountNumber')}
                      className={`h-9 pl-8 text-xs rounded-lg border-zinc-200 focus:ring-zinc-900 transition-all ${isFieldLocked('accountNumber') ? "bg-zinc-50 text-zinc-600 cursor-not-allowed font-mono" : "bg-white font-mono"} ${fieldErrors.accountNumber ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                {fieldErrors.accountNumber && <p className="text-red-500 text-[9px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.accountNumber}</p>}
              </div>

              <div className="space-y-0.5">
                <Label htmlFor="confirmAccountNumber" className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                   Confirm Account
                   {isFieldLocked('accountNumber') && <span className="text-amber-500 ml-1">(Locked)</span>}
                </Label>
                <div className="relative group">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-zinc-900 transition-colors" />
                  <Input
                      id="confirmAccountNumber"
                      value={formData.confirmAccountNumber}
                      onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 18);
                          setFormData(prev => ({ ...prev, confirmAccountNumber: val }));
                          if (fieldErrors.confirmAccountNumber) setFieldErrors(prev => ({ ...prev, confirmAccountNumber: '' }));
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={18}
                      placeholder="Re-enter account number"
                      required
                      readOnly={isFieldLocked('accountNumber')}
                      className={`h-9 pl-8 text-xs font-mono rounded-lg border-zinc-200 focus:ring-zinc-900 transition-all ${isFieldLocked('accountNumber') ? "bg-zinc-50 text-zinc-600 cursor-not-allowed" : "bg-white"} ${fieldErrors.confirmAccountNumber ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                {fieldErrors.confirmAccountNumber && <p className="text-red-500 text-[9px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.confirmAccountNumber}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="ifscCode" className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                   IFSC Code
                   {isFieldLocked('ifscCode') && <span className="text-amber-500 ml-1">(Locked)</span>}
                </Label>
                <div className="relative group">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-zinc-900 transition-colors" />
                  <Input
                      id="ifscCode"
                      value={formData.ifscCode}
                      onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            ifscCode: normalizeIfsc(e.target.value),
                          }));
                          if (fieldErrors.ifscCode) setFieldErrors(prev => ({ ...prev, ifscCode: '' }));
                      }}
                      placeholder="e.g., HDFC0001234"
                      required
                      readOnly={isFieldLocked('ifscCode')}
                      maxLength={11}
                      className={`h-9 pl-8 text-xs font-mono uppercase rounded-lg border-zinc-200 focus:ring-zinc-900 transition-all ${isFieldLocked('ifscCode') ? "bg-zinc-50 text-zinc-600 cursor-not-allowed" : "bg-white"} ${fieldErrors.ifscCode ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                {fieldErrors.ifscCode && <p className="text-red-500 text-[9px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.ifscCode}</p>}
                {ifscLoading && (
                  <p className="text-[9px] text-blue-600 font-semibold flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Checking IFSC…
                  </p>
                )}
                {ifscData && !ifscLoading && (
                  <p className="text-[10px] text-zinc-700 leading-snug pt-0.5">
                    <span className="font-bold">{ifscData.bank}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="text-slate-600">{ifscData.branch}</span>
                    {(ifscData.city || ifscData.state) && (
                      <span className="text-slate-400"> ({[ifscData.city, ifscData.state].filter(Boolean).join(', ')})</span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-0.5">
                <Label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                   Account Type
                   {isFieldLocked('accountType') && <span className="text-amber-500 ml-1">(Locked)</span>}
                </Label>
                <select
                  disabled={isFieldLocked('accountType')}
                  value={formData.accountType || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-zinc-200 focus:ring-zinc-900 text-xs bg-white px-2.5 disabled:opacity-50"
                >
                  <option value="" disabled>Select type</option>
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                </select>
              </div>
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="upiId" className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                 UPI ID <span className="normal-case tracking-normal font-semibold text-slate-400">(optional)</span>
                 {isFieldLocked('upiId') && <span className="text-amber-500 ml-1">(Locked)</span>}
              </Label>
              <div className="relative group">
                <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-zinc-900 transition-colors" />
                <Input
                  id="upiId"
                  value={formData.upiId}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, upiId: e.target.value.trim() }));
                    if (fieldErrors.upiId) setFieldErrors(prev => ({ ...prev, upiId: '' }));
                  }}
                  placeholder="e.g., 9876543210@paytm"
                  readOnly={isFieldLocked('upiId')}
                  maxLength={100}
                  className={`h-9 pl-8 text-xs rounded-lg border-zinc-200 focus:ring-zinc-900 transition-all ${isFieldLocked('upiId') ? "bg-zinc-50 text-zinc-600 cursor-not-allowed" : "bg-white"} ${fieldErrors.upiId ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
              {fieldErrors.upiId && <p className="text-red-500 text-[9px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.upiId}</p>}
            </div>
        </div>
    </StepLayout>
  );
}
