import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock } from 'lucide-react';
import UploadSlot from './UploadSlot';

export default function DocumentBackupSection({
  aadhaar,
  setAadhaar,
  aadhaarFrozen,
  pan,
  setPan,
  panFrozen,
  fieldErrors,
  setFieldErrors,
  maxDocMb,
  slots,
  otherDocType,
  setOtherDocType,
  handleFileChange,
  handleRemove,
  handleRetry,
}) {
  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              Aadhaar Number {!aadhaarFrozen && <span className="text-red-500 font-bold">*</span>}
              {aadhaarFrozen && <Lock className="w-2.5 h-2.5" />}
            </Label>
            <div className="relative group">
              <Input
                id="aadhaarInput"
                value={aadhaar ? String(aadhaar).replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ') : ''}
                onChange={(e) => {
                  if (aadhaarFrozen) return;
                  const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setAadhaar(val);
                  if (fieldErrors.aadhaar) setFieldErrors((prev) => ({ ...prev, aadhaar: '' }));
                }}
                placeholder="Enter 12-digit Aadhaar number"
                readOnly={aadhaarFrozen}
                className={`h-10 rounded-lg bg-white border-zinc-200 focus:ring-zinc-900 font-bold text-xs tracking-wider tabular-nums ${aadhaarFrozen ? 'bg-zinc-50/50 text-slate-500 border-zinc-100 opacity-70' : ''} ${fieldErrors.aadhaar ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
              />
              {aadhaarFrozen && <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-zinc-100 rounded text-[8px] font-black text-slate-500 uppercase">LOCKED</div>}
            </div>
            {fieldErrors.aadhaar ? (
              <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.aadhaar}
              </p>
            ) : !aadhaarFrozen && !aadhaar ? (
              <p className="text-slate-400 text-[9px] font-medium ml-1">
                Enter your 12-digit Aadhaar number from your card
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              PAN Card Number {!panFrozen && <span className="text-red-500 font-bold">*</span>}
              {panFrozen && <Lock className="w-2.5 h-2.5" />}
            </Label>
            <div className="relative group">
              <Input
                id="panInput"
                value={pan}
                onChange={(e) => {
                  if (panFrozen) return;
                  const val = e.target.value.toUpperCase().slice(0, 10);
                  setPan(val);
                  if (fieldErrors.pan) setFieldErrors((prev) => ({ ...prev, pan: '' }));
                }}
                placeholder="Enter 10-character PAN"
                readOnly={panFrozen}
                className={`h-10 rounded-lg bg-white border-zinc-200 focus:ring-zinc-900 font-bold text-xs tracking-widest uppercase ${panFrozen ? 'bg-zinc-50/50 text-slate-500 border-zinc-100 opacity-70' : ''} ${fieldErrors.pan ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
              />
              {panFrozen && <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-zinc-100 rounded text-[8px] font-black text-slate-500 uppercase">LOCKED</div>}
            </div>
            {fieldErrors.pan ? (
              <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.pan}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
          Required Documents <span className="text-slate-600 font-bold normal-case tracking-normal">(max {maxDocMb} MB each, JPG/PNG/PDF)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UploadSlot
            label="Aadhaar Front"
            field="aadhaarFront"
            slot={slots.aadhaarFront}
            onFileChange={handleFileChange}
            onRemove={() => handleRemove('aadhaarFront')}
            onRetry={() => handleRetry('aadhaarFront')}
          />
          <UploadSlot
            label="Aadhaar Back"
            field="aadhaarBack"
            slot={slots.aadhaarBack}
            onFileChange={handleFileChange}
            onRemove={() => handleRemove('aadhaarBack')}
            onRetry={() => handleRetry('aadhaarBack')}
          />
          <UploadSlot
            label="PAN Card Front"
            field="panFile"
            slot={slots.panFile}
            onFileChange={handleFileChange}
            onRemove={() => handleRemove('panFile')}
            onRetry={() => handleRetry('panFile')}
          />
          <div className="space-y-1.5 flex flex-col justify-between">
            <select
              value={otherDocType}
              onChange={(e) => setOtherDocType(e.target.value)}
              className="h-9 rounded-lg bg-zinc-50 border border-zinc-100 text-[9px] font-black uppercase tracking-wider px-3 w-full"
            >
              <option value="" disabled>Other Proof</option>
              <option value="electricity_bill">Electricity Bill</option>
              <option value="gas_bill">Gas Bill</option>
              <option value="rent_agreement">Rent Agreement</option>
              <option value="voter_id">Voter ID</option>
              <option value="driving_license">Driving License</option>
            </select>
            <UploadSlot
              label="Residence Proof"
              field="otherFile"
              slot={slots.otherFile}
              onFileChange={handleFileChange}
              onRemove={() => handleRemove('otherFile')}
              onRetry={() => handleRetry('otherFile')}
            />
          </div>
        </div>
      </div>
    </>
  );
}
