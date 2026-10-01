import { useState, useEffect, memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CheckCircle2, Phone, User, ArrowRight, RotateCcw, Plus, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import { documentsAPI } from '@/lib/api';
import { handleFormError } from '@/lib/utils/formErrors';
import {
  getApplicantForbiddenMobiles,
  normalizeIndianMobile,
  validateReferenceMobiles,
} from '@/lib/utils/mobile';
import StepLayout from './StepLayout';

const emptyForm = {
  ref1Id: null,
  ref1Name: '',
  ref1Mobile: '',
  ref1Relationship: 'friend',
  ref2Id: null,
  ref2Name: '',
  ref2Mobile: '',
  ref2Relationship: 'colleague',
};

export default function ReferenceForm({
  onSuccess,
  onClose,
  applicationId,
  reapplicationData,
  isAdminMode = false,
  targetUserId = null,
  applicationData = null,
  isEditing = false,
}) {
  const isReturningUser = reapplicationData?.isReturningUser || false;
  const previousReferences = reapplicationData?.previousReferences || null;
  const hasExistingRefs = (applicationData?.references?.length || 0) > 0;

  const [usePrevious, setUsePrevious] = useState(
    !isEditing && isReturningUser && previousReferences?.length > 0 && !hasExistingRefs
  );
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [removingSlot, setRemovingSlot] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  useEffect(() => {
    if (applicationData?.references?.length > 0) {
      const refs = applicationData.references;
      const getVal = (obj, snake, camel) => {
        if (!obj) return '';
        if (obj[snake] !== undefined && obj[snake] !== null) return obj[snake];
        if (obj[camel] !== undefined && obj[camel] !== null) return obj[camel];
        return '';
      };

      setFormData({
        ref1Id: getVal(refs[0], 'id') || null,
        ref1Name: getVal(refs[0], 'reference_name', 'ref1Name') || getVal(refs[0], 'name', ''),
        ref1Mobile: getVal(refs[0], 'reference_mobile', 'ref1Mobile') || getVal(refs[0], 'mobile', ''),
        ref1Relationship:
          getVal(refs[0], 'relationship', 'ref1Relationship') ||
          getVal(refs[0], 'reference_relationship', 'friend') ||
          'friend',
        ref2Id: getVal(refs[1], 'id') || null,
        ref2Name: getVal(refs[1], 'reference_name', 'ref2Name') || getVal(refs[1], 'name', ''),
        ref2Mobile: getVal(refs[1], 'reference_mobile', 'ref2Mobile') || getVal(refs[1], 'mobile', ''),
        ref2Relationship:
          getVal(refs[1], 'relationship', 'ref2Relationship') ||
          getVal(refs[1], 'reference_relationship', 'colleague') ||
          'colleague',
      });
      setUsePrevious(false);
      return;
    }

    if (isAdminMode && targetUserId && !previousReferences) {
      documentsAPI
        .getReferences({ targetUserId })
        .then((res) => {
          if (res.status === 1 && res.data?.length > 0) {
            const refs = res.data;
            setFormData({
              ref1Id: refs[0]?.id || null,
              ref1Name: refs[0]?.name || refs[0]?.reference_name || '',
              ref1Mobile: refs[0]?.mobile || refs[0]?.reference_mobile || '',
              ref1Relationship: refs[0]?.relationship || 'friend',
              ref2Id: refs[1]?.id || null,
              ref2Name: refs[1]?.name || refs[1]?.reference_name || '',
              ref2Mobile: refs[1]?.mobile || refs[1]?.reference_mobile || '',
              ref2Relationship: refs[1]?.relationship || 'colleague',
            });
          }
        })
        .catch((err) => console.error('Error fetching references:', err));
    }
  }, [isAdminMode, targetUserId, previousReferences, applicationData]);

  const clearSlot = useCallback(async (slot) => {
    const idKey = slot === 1 ? 'ref1Id' : 'ref2Id';
    const id = formData[idKey];
    setRemovingSlot(slot);
    setError('');
    try {
      if (id) {
        await documentsAPI.deleteReference(id);
      }
      setFormData((prev) => {
        if (slot === 1) {
          return {
            ...prev,
            ref1Id: null,
            ref1Name: '',
            ref1Mobile: '',
            ref1Relationship: 'friend',
          };
        }
        return {
          ...prev,
          ref2Id: null,
          ref2Name: '',
          ref2Mobile: '',
          ref2Relationship: 'colleague',
        };
      });
      setSuccess('Reference removed. Fill in a new contact and save.');
    } catch (err) {
      setError(err.message || 'Failed to remove reference');
    } finally {
      setRemovingSlot(null);
    }
  }, [formData]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});

    const forbiddenMobiles = getApplicantForbiddenMobiles(applicationData);
    const validationErrors = validateReferenceMobiles({
      ref1Mobile: formData.ref1Mobile,
      ref2Mobile: formData.ref2Mobile,
      forbiddenMobiles,
    });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    if (!formData.ref1Name?.trim() || !formData.ref2Name?.trim()) {
      setError('Please enter both reference names.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Dual addReference replaces existing rows — works for create and update
      const payload = {
        ref1_name: formData.ref1Name,
        ref1_mobile: normalizeIndianMobile(formData.ref1Mobile),
        ref1_relationship: formData.ref1Relationship,
        ref2_name: formData.ref2Name,
        ref2_mobile: normalizeIndianMobile(formData.ref2Mobile),
        ref2_relationship: formData.ref2Relationship,
        loan_application_id: applicationId,
        targetUserId: targetUserId,
        userId: targetUserId,
      };

      const response = await documentsAPI.addReference(payload);
      if (response.status === 1 || response.status === 201) {
        setSuccess(
          hasExistingRefs || isEditing
            ? 'References updated successfully!'
            : 'Reference details added successfully!'
        );
        if (onSuccess) {
          setTimeout(() => onSuccess(response?.data), 300);
        }
      }
    } catch (err) {
      handleFormError(err, setFieldErrors, setError);
    } finally {
      setLoading(false);
    }
  };

  const handleUsePrevious = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { loanAPI } = await import('@/lib/api/loan');
      const response = await loanAPI.completeStep({
        stepName: 'reference',
        targetUserId: targetUserId,
      });

      setSuccess('Previous references reused successfully!');
      if (onSuccess) {
        setTimeout(() => onSuccess(response?.data), 300);
      }
    } catch (err) {
      setError(err.message || 'Failed to reuse previous references');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepLayout
      title="Reference Details"
      description={
        isEditing || hasExistingRefs
          ? 'Update or replace your contacts.'
          : 'Add trusted contacts for verification.'
      }
      onClose={onClose}
      icon={Users}
      footer={
        <Button
          onClick={usePrevious ? handleUsePrevious : handleSubmit}
          disabled={loading}
          className="w-full h-12 text-sm font-semibold bg-[#222222] hover:bg-[#111111] text-white shadow-md rounded-lg transition-all active:scale-[0.98]"
        >
          {loading ? (
            <Spinner className="w-5 h-5 text-white mr-2" />
          ) : usePrevious ? (
            'CONTINUE WITH PREVIOUS'
          ) : isEditing || hasExistingRefs ? (
            'UPDATE REFERENCES'
          ) : (
            'SAVE REFERENCES'
          )}
          {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
        </Button>
      }
    >
      {isReturningUser && previousReferences?.length > 0 && !isEditing && (
        <div className="mb-6">
          <div className="p-3.5 bg-blue-50/50 border border-blue-100/50 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-100 shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-900 tracking-tight leading-tight">
                  Fast-track with previous references
                </p>
                <p className="text-[10px] text-blue-700/80 font-medium mt-0.5">
                  We found your references from previous successful applications.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUsePrevious(true)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-300 ${
                usePrevious
                  ? 'border-[#222222] bg-slate-50 shadow-sm'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <RotateCcw className={`w-4 h-4 mb-2 ${usePrevious ? 'text-[#222222]' : 'text-slate-300'}`} />
              <p className="text-[10px] font-semibold text-slate-900 uppercase tracking-tight">Reuse Existing</p>
            </button>
            <button
              type="button"
              onClick={() => setUsePrevious(false)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-300 ${
                !usePrevious
                  ? 'border-[#222222] bg-slate-50 shadow-sm'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <Plus className={`w-4 h-4 mb-2 ${!usePrevious ? 'text-[#222222]' : 'text-slate-300'}`} />
              <p className="text-[10px] font-semibold text-slate-900 uppercase tracking-tight">Add New</p>
            </button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 py-2 rounded-lg border-red-100 bg-red-50/30">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          <AlertDescription className="text-[10px] font-bold text-red-800 ml-1.5">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4 py-2 rounded-lg bg-green-50/50 border-green-100 text-green-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          <AlertDescription className="text-[10px] font-bold ml-1.5">{success}</AlertDescription>
        </Alert>
      )}

      {usePrevious && previousReferences?.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">
            Confirmed References
          </p>
          {previousReferences.map((ref, index) => (
            <div
              key={index}
              className="bg-white border border-slate-100 rounded-lg p-3.5 shadow-sm flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-[#222222] text-white rounded-lg flex items-center justify-center text-[10px] font-bold shadow-md">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-xs">{ref.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500 font-medium tabular-nums">{ref.mobile}</span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span className="text-[10px] text-slate-400 font-medium uppercase">{ref.relationship}</span>
                </div>
              </div>
              <CheckCircle2 className="w-4.5 h-4.5 text-green-500 opacity-50" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-1">
            Enter Contact References
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReferenceSection
              index={1}
              nameLabel="ref1Name"
              mobileLabel="ref1Mobile"
              relLabel="ref1Relationship"
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              onClear={() => clearSlot(1)}
              clearing={removingSlot === 1}
              canClear={!!(formData.ref1Id || formData.ref1Name || formData.ref1Mobile)}
            />
            <ReferenceSection
              index={2}
              nameLabel="ref2Name"
              mobileLabel="ref2Mobile"
              relLabel="ref2Relationship"
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              onClear={() => clearSlot(2)}
              clearing={removingSlot === 2}
              canClear={!!(formData.ref2Id || formData.ref2Name || formData.ref2Mobile)}
            />
          </div>
        </div>
      )}
    </StepLayout>
  );
}

const ReferenceSection = memo(
  ({
    index,
    nameLabel,
    mobileLabel,
    relLabel,
    formData,
    handleInputChange,
    setFormData,
    fieldErrors,
    setFieldErrors,
    onClear,
    clearing,
    canClear,
  }) => {
    const relationshipOptions = [
      { value: 'parent', label: 'Parent' },
      { value: 'spouse', label: 'Spouse' },
      { value: 'sibling', label: 'Sibling' },
      { value: 'friend', label: 'Friend' },
      { value: 'colleague', label: 'Colleague' },
      { value: 'relative', label: 'Other Relative' },
    ];

    return (
      <div className="space-y-3.5 bg-slate-50/50 border border-slate-100 p-4 rounded-lg relative">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100/80">
          <div className="w-5 h-5 bg-[#222222] text-white rounded-md flex items-center justify-center text-[9px] font-bold">
            {index}
          </div>
          <h4 className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">
            Reference {index}
          </h4>
          {canClear && onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={clearing}
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              {clearing ? 'Removing…' : 'Clear'}
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
              Full Name
            </Label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <Input
                name={nameLabel}
                value={formData[nameLabel]}
                onChange={handleInputChange}
                placeholder="Full Name"
                className={`h-10 pl-9 rounded-lg bg-white border-slate-200 focus:ring-[#222222] font-medium text-xs ${
                  fieldErrors[nameLabel] ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
            </div>
            {fieldErrors[nameLabel] && (
              <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fieldErrors[nameLabel]}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
              Mobile Number
            </Label>
            <div className="relative group">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <Input
                type="tel"
                value={formData[mobileLabel]}
                onChange={(e) => {
                  handleInputChange({
                    target: { name: mobileLabel, value: e.target.value.replace(/\D/g, '').slice(0, 10) },
                  });
                  if (fieldErrors[mobileLabel]) {
                    setFieldErrors((prev) => ({ ...prev, [mobileLabel]: '' }));
                  }
                }}
                placeholder="10-digit number"
                className={`h-10 pl-9 rounded-lg bg-white border-slate-200 focus:ring-[#222222] font-medium text-xs tabular-nums ${
                  fieldErrors[mobileLabel] ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
            </div>
            {fieldErrors[mobileLabel] && (
              <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fieldErrors[mobileLabel]}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">
              Relationship
            </Label>
            <select
              value={formData[relLabel] || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, [relLabel]: val }));
                if (fieldErrors[relLabel]) {
                  setFieldErrors((prev) => ({ ...prev, [relLabel]: '' }));
                }
              }}
              className={`h-10 w-full rounded-lg bg-white border border-slate-200 focus:ring-[#222222] font-medium text-xs px-3 ${
                fieldErrors[relLabel] ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            >
              <option value="" disabled>Select relationship</option>
              {relationshipOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors[relLabel] && (
              <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {fieldErrors[relLabel]}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);
