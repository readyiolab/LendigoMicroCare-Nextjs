import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

const PersonalInfoSection = memo(({ formData, handleInputChange, fieldErrors, isEmailVerified, isAdminMode = false, isMobileVerified, onVerifyEmail, onVerifyMobile, emailCheckLoading, emailVerifyOpening, onEmailBlur, isReturningUser, workflowStatus, workflowDetails, smsOtpEnabled = false }) => {
  const isPanEditable = workflowStatus === 'RETRY_ALLOWED' && workflowDetails.editableFields?.includes('pancard');
  const isNameEditable = workflowStatus === 'RETRY_ALLOWED' && workflowDetails.editableFields?.includes('fullName');
  const emailFieldError = isAdminMode && String(fieldErrors.personalEmail || '').toLowerCase().includes('verify your email')
    ? ''
    : fieldErrors.personalEmail;

  return (
  <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
          <h4 className="text-sm font-semibold text-zinc-900 uppercase tracking-tight">Personal Identity</h4>
          {isReturningUser && (
            <Badge className="ml-auto text-[9px] bg-blue-50 text-blue-700 border-blue-200">
              <Lock className="w-2.5 h-2.5 mr-1" /> Returning Customer
            </Badge>
          )}
      </div>

      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg flex gap-3 items-start">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 shrink-0">
          <ShieldCheck className="w-4 h-4 text-zinc-900" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-900">Identity & verification</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            PAN is collected here for eligibility matching. Aadhaar number and document verification happen in the next eKYC step.
            Only one email can be linked to your account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="col-span-1 md:col-span-2 space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                Full Name (As per PAN)
                {isReturningUser && !isNameEditable && <Lock className="w-3 h-3 text-amber-500" />}
              </Label>
              <Input
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  readOnly={isReturningUser && !isNameEditable}
                  className={`h-9 text-sm border-zinc-200 focus:ring-zinc-900 ${isReturningUser && !isNameEditable ? "bg-zinc-50 text-zinc-600 cursor-not-allowed border-amber-200" : "bg-white"} ${fieldErrors.fullName ? "border-red-500" : ""}`}
              />
              {isReturningUser && !isNameEditable && <p className="text-amber-600 text-[10px] flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> This field cannot be changed</p>}
              {fieldErrors.fullName && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.fullName}</p>}
          </div>

          <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                PAN Number
                {isReturningUser && !isPanEditable && <Lock className="w-3 h-3 text-amber-500" />}
              </Label>
              <Input
                  name="pancard"
                  placeholder="ABCDE1234F"
                  value={formData.pancard}
                  onChange={(e) => handleInputChange({ target: { name: 'pancard', value: e.target.value.toUpperCase() } })}
                  required
                  readOnly={isReturningUser && !isPanEditable}
                  maxLength={10}
                  className={`h-9 text-sm font-mono uppercase border-zinc-200 focus:ring-zinc-900 ${isReturningUser && !isPanEditable ? "bg-zinc-50 text-zinc-600 cursor-not-allowed border-amber-200" : "bg-white"} ${fieldErrors.pancard ? "border-red-500 focus:ring-red-500" : ""}`}
              />
              {isReturningUser && !isPanEditable && <p className="text-amber-600 text-[10px] flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> This field cannot be changed</p>}
              {fieldErrors.pancard && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.pancard}</p>}
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="dob" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Date of Birth</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleInputChange}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 60)).toISOString().split('T')[0]}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className={`h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.dob ? "border-red-500" : ""}`}
                required
              />
              {fieldErrors.dob && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.dob}</p>}
          </div>

          <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Gender</Label>
              <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`h-9 w-full rounded-md border px-3 text-sm bg-white border-zinc-200 focus:ring-zinc-900 ${fieldErrors.gender ? "border-red-500" : ""}`}
              >
                  <option value="" disabled>Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
              </select>
              {fieldErrors.gender && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.gender}</p>}
          </div>

           <div className="space-y-1.5">
              <Label htmlFor="personalEmail" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Email Address</Label>
              <div className="flex gap-2">
                  <Input
                      id="personalEmail"
                      type="email"
                      name="personalEmail"
                      value={formData.personalEmail}
                      onChange={handleInputChange}
                      onBlur={onEmailBlur}
                      placeholder="name@example.com"
                      required
                      readOnly={isEmailVerified}
                      className={`h-9 text-sm border-zinc-200 focus:ring-zinc-900 flex-1 ${emailFieldError ? "border-red-500" : ""} ${isEmailVerified ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                  />
                  {formData.personalEmail && isEmailVerified && (
                      <Badge className="h-9 px-3 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Verified
                      </Badge>
                  )}
                  {formData.personalEmail && !isEmailVerified && !isAdminMode && (
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={emailVerifyOpening || fieldErrors.personalEmail === 'This email is already linked with another account. Please use a different email address.'}
                          className="h-9 px-3 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 font-bold disabled:opacity-50"
                          onClick={onVerifyEmail}
                      >
                          {(emailVerifyOpening || emailCheckLoading) ? <Spinner className="w-4 h-4" /> : 'Verify'}
                      </Button>
                  )}
              </div>
              {emailFieldError && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {emailFieldError}</p>}
              {isAdminMode && !isEmailVerified && (
                <p className="text-[11px] text-slate-500 leading-snug mt-1">
                  The telecaller confirms this email when you continue. The customer does not need to enter a code.
                </p>
              )}
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mobile Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-medium">+91</span>
                  <Input
                      id="mobile"
                      name="mobile"
                      value={formData.mobile}
                      onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          handleInputChange({ target: { name: 'mobile', value: val } });
                      }}
                      placeholder="0000000000"
                      required
                      maxLength={10}
                      readOnly={isMobileVerified}
                      className={`h-9 pl-10 text-sm border-zinc-200 focus:ring-zinc-900 ${fieldErrors.mobile ? "border-red-500" : ""} ${isMobileVerified ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                  />
                </div>
                {formData.mobile && (
                  isMobileVerified ? (
                    <Badge className="h-9 px-3 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Verified
                    </Badge>
                  ) : smsOtpEnabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={formData.mobile.length !== 10}
                      onClick={onVerifyMobile}
                      className="h-9 px-3 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 font-bold disabled:opacity-50"
                    >
                      Verify
                    </Button>
                  ) : null
                )}
              </div>
              {fieldErrors.mobile && <p className="text-red-500 text-[11px] font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.mobile}</p>}
          </div>
      </div>
  </div>
);
});

export default PersonalInfoSection;
