import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileText, CheckCircle2, Home, Trash2, RotateCcw, Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import { documentsAPI } from '@/lib/api';
import { handleFormError } from '@/lib/utils/formErrors';

export default function ResidenceProofForm({ onSuccess, onClose, applicationId, reapplicationData, isAdminMode = false, targetUserId = null }) {
  const isReturningUser = reapplicationData?.isReturningUser || false;
  const previousProofs = reapplicationData?.previousResidenceProofs || null;

  const [usePrevious, setUsePrevious] = useState(isReturningUser && previousProofs?.length > 0);
  const [files, setFiles] = useState([null, null]);
  const [docTypes, setDocTypes] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFileChange = (index, file) => {
    if (file && file.size > 10 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, [`file${index}`]: 'File size must be less than 10MB' }));
      setError('File size must be less than 10MB');
      return;
    }
    const newFiles = [...files];
    newFiles[index] = file;
    setFiles(newFiles);
    setError('');
    if (fieldErrors[`file${index}`]) {
      setFieldErrors(prev => ({ ...prev, [`file${index}`]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setError('');

    const newErrors = {};
    if (!files[0]) newErrors.file0 = 'Please upload Document 1';
    if (!files[1]) newErrors.file1 = 'Please upload Document 2';
    if (!docTypes[0]) newErrors.docType0 = 'Please select document type for Document 1';
    if (!docTypes[1]) newErrors.docType1 = 'Please select document type for Document 2';

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError('Please select document type and upload file for both slots');
      return;
    }

    setLoading(true);
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('documents', files[0]);
      formData.append('documents', files[1]);
      formData.append('documentTypes', JSON.stringify(docTypes));
      
      if (applicationId) {
        formData.append('loanApplicationId', applicationId);
      }

      if (targetUserId) {
          formData.append('targetUserId', targetUserId);
      }

      const response = await documentsAPI.uploadResidenceProof(formData, targetUserId);
      if (response.status === 1) {
        setSuccess('Residence proof uploaded successfully!');
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

  const handleUsePrevious = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { loanAPI } = await import('@/lib/api');
      await loanAPI.completeStep({ 
          stepName: 'residence_proof',
          targetUserId: targetUserId 
      });

      setSuccess('Previous residence proof documents reused successfully!');
      if (onSuccess) {
          setTimeout(() => onSuccess(), 300);
      }
    } catch (err) {
      setError(err.message || 'Failed to reuse previous documents');
    } finally {
      setLoading(false);
    }
  };

  const docTypeLabels = {
    pan_card: 'PAN Card',
    aadhaar_card: 'Aadhaar Card',
    voter_id: 'Voter ID Card',
    driving_license: 'Driving License',
    electricity_bill: 'Electricity Bill',
    gas_bill: 'Gas Bill',
    water_bill: 'Water Bill',
    rent_agreement: 'Rent Agreement',
    property_tax: 'Property Tax'
  };

  return (
    <Card className="border-2 shadow-none bg-transparent border-zinc-200 rounded-lg p-6">
      <CardHeader className="px-0 pt-0 pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-zinc-900">Residence Proof</CardTitle>
              <CardDescription className="text-slate-500 text-sm">Upload documents to verify your address.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-500 hover:text-zinc-900">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && (
          <Alert variant="destructive" className="mb-6 py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-6 py-2 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs ml-2">{success}</AlertDescription>
          </Alert>
        )}

        {/* Returning User Toggle */}
        {isReturningUser && previousProofs?.length > 0 && (
          <div className="mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900">Previous Documents Found</p>
                  <p className="text-xs text-blue-700">You can reuse your previous residence proof or upload new ones.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUsePrevious(true)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  usePrevious 
                    ? 'border-zinc-900 bg-zinc-50 shadow-sm' 
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <RotateCcw className={`w-4 h-4 mb-2 ${usePrevious ? 'text-zinc-900' : 'text-slate-500'}`} />
                <p className="text-xs font-bold text-zinc-900">Use Previous</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Reuse existing documents</p>
              </button>
              <button
                type="button"
                onClick={() => setUsePrevious(false)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  !usePrevious 
                    ? 'border-zinc-900 bg-zinc-50 shadow-sm' 
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <Plus className={`w-4 h-4 mb-2 ${!usePrevious ? 'text-zinc-900' : 'text-slate-500'}`} />
                <p className="text-xs font-bold text-zinc-900">Upload New</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Upload fresh documents</p>
              </button>
            </div>
          </div>
        )}

        {/* Use Previous Documents View */}
        {usePrevious && previousProofs?.length > 0 ? (
          <div className="space-y-4">
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Previous Documents
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previousProofs.map((proof, index) => (
                <div key={proof.id} className="bg-white border border-zinc-200 rounded-lg p-3 flex items-center gap-3 shadow-sm">
                  <div className="p-2 bg-green-50 text-green-600 rounded-md shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 text-xs truncate">
                      {docTypeLabels[proof.documentType] || proof.documentType}
                    </p>
                    <p className="text-[10px] text-green-600 font-medium">Previously Verified</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleUsePrevious}
              disabled={loading}
              className="w-full h-10 text-xs font-bold bg-white hover:bg-slate-100 text-white shadow-md hover:shadow-lg transition-all uppercase tracking-wide"
            >
              {loading ? <Spinner className="size-4 text-white" /> : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Use Previous Documents & Continue
                </>
              )}
            </Button>
          </div>
        ) : (
        /* Upload New Documents Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map((index) => (
              <div key={index} className="space-y-2">
                <Label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Document {index + 1}
                </Label>

                <select
                  value={docTypes[index] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newTypes = [...docTypes];
                    newTypes[index] = val;
                    setDocTypes(newTypes);
                    if (fieldErrors[`docType${index}`]) {
                      setFieldErrors(prev => ({ ...prev, [`docType${index}`]: '' }));
                    }
                  }}
                  className={`h-9 w-full rounded-md border px-3 text-xs bg-white border-zinc-200 ${fieldErrors[`docType${index}`] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                >
                  <option value="" disabled>Select Document Type</option>
                  <option value="aadhaar_card">Aadhaar Card</option>
                  <option value="voter_id">Voter ID Card</option>
                  <option value="driving_license">Driving License</option>
                  <option value="electricity_bill">Electricity Bill</option>
                  <option value="gas_bill">Gas Bill</option>
                  <option value="water_bill">Water Bill</option>
                  <option value="rent_agreement">Rent Agreement</option>
                  <option value="property_tax">Property Tax</option>
                </select>
                {fieldErrors[`docType${index}`] && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors[`docType${index}`]}</p>}
                
                {!files[index] ? (
                  <div
                    className={`group border border-dashed rounded-lg p-6 text-center hover:border-zinc-900 hover:bg-zinc-50/50 transition-all cursor-pointer bg-zinc-50/30 ${fieldErrors[`file${index}`] ? "border-red-500 bg-red-50/5" : "border-zinc-300"}`}
                    onClick={() => document.getElementById(`residence-proof-${index}`).click()}
                  >
                    <div className="p-2 bg-white border border-zinc-200 shadow-sm rounded-lg w-fit mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-4 h-4 text-slate-500 group-hover:text-zinc-900" />
                    </div>
                    <p className="text-xs text-zinc-900 font-semibold mb-0.5">Click to upload</p>
                    <p className="text-[10px] text-slate-500">Image or PDF (Max 10MB)</p>
                  </div>
                ) : (
                  <div className="bg-white border border-zinc-200 rounded-lg p-3 flex items-center justify-between shadow-sm animate-in fade-in-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-green-50 text-green-600 rounded-md shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 text-xs truncate">{files[index].name}</p>
                        <p className="text-[10px] text-slate-500">{(files[index].size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFileChange(index, null)}
                      className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                {fieldErrors[`file${index}`] && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors[`file${index}`]}</p>}

                <Input
                  id={`residence-proof-${index}`}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(index, e.target.files[0])}
                  className="hidden"
                />
              </div>
            ))}
          </div>

          <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4">
            <h4 className="font-semibold text-zinc-900 mb-2 text-xs flex items-center gap-2">
                 <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" /> Accepted Documents
            </h4>
            <ul className="text-[10px] text-zinc-600 space-y-1 list-disc list-inside font-medium ml-1">
              <li>Aadhaar Card (Front & Back)</li>
              <li>Voter ID Card</li>
              <li>Driving License</li>
              <li>Electricity/Water Bill (Max 3 months old)</li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={loading || !files[0] || !files[1]}
            className="w-full h-10 text-xs font-bold bg-white hover:bg-slate-100 text-white shadow-md hover:shadow-lg transition-all uppercase tracking-wide"
          >
            {loading ? <Spinner className="size-4 text-white" /> : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </>
            )}
          </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}