import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { kycAPI } from '@/lib/api';
import { uploadToS3, getOptimizedUrl, UPLOAD_FOLDERS, UploadAbortedError } from '@/lib/services/cloudinaryUpload';
import CameraCapture from '@/components/CameraCapture';
import VerificationCorrectionAlert from '@/components/verification/VerificationCorrectionAlert';
import { handleFormError } from '@/lib/utils/formErrors';
import StepLayout from './StepLayout';
import { pickSelfieDisplayUrl } from '@/lib/utils/media';

export default function SelfieForm({ onSuccess, onClose, isAdminMode = false, targetUserId = null, applicationData = null }) {
  const [selfieFile, setSelfieFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const abortRef = useRef(null);
  const genRef = useRef(0);
  const promiseRef = useRef(null);
  const resultRef = useRef(null);
  const previewUrlRef = useRef(null);

  const uploading = uploadStatus === 'uploading' || uploadStatus === 'optimizing';
  const loading = isSubmitting || uploading;

  // Workflow State for Selfie Correction
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [workflowDetails, setWorkflowDetails] = useState({});

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (applicationData?.selfie?.wf_status) {
       setWorkflowStatus(applicationData.selfie.wf_status);
       setWorkflowDetails({
          reasonCode: applicationData.selfie.wf_reason_code,
          customerMessage: applicationData.selfie.wf_customer_message,
          retryCount: applicationData.selfie.wf_retry_count || 0,
          maxRetry: applicationData.selfie.wf_max_retry || 3,
       });
    }

    // 1. Check if selfie exists in passed applicationData or reapplicationData
    const existingSelfieUrl =
      applicationData?.selfie?.selfie_display_url
      || applicationData?.selfie?.display_url
      || applicationData?.reapplicationData?.previousSelfieDisplayUrl
      || applicationData?.selfie?.selfie_url
      || applicationData?.reapplicationData?.previousSelfieUrl;
    
    if (existingSelfieUrl && applicationData?.selfie?.wf_status !== 'RETRY_ALLOWED') {
        setSuccess('Selfie already uploaded for this user.');
        return;
    }

    // 2. Fallback: If in admin mode but no data passed, fetch manually
    if (isAdminMode && targetUserId && !applicationData) {
        kycAPI.getSelfieStatus({ targetUserId })
            .then(res => {
                if (res.status === 1) {
                    if (res.data?.wf_status) {
                       setWorkflowStatus(res.data.wf_status);
                       setWorkflowDetails({
                          reasonCode: res.data.wf_reason_code,
                          customerMessage: res.data.wf_customer_message,
                          retryCount: res.data.wf_retry_count || 0,
                          maxRetry: res.data.wf_max_retry || 3,
                       });
                    }
                    if (res.data?.selfie_url && res.data?.wf_status !== 'RETRY_ALLOWED') {
                        setSuccess('Selfie already uploaded for this user.');
                    }
                }
            })
            .catch(err => console.error('Error fetching selfie status:', err));
    }
  }, [isAdminMode, targetUserId, applicationData]);

  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (!window.isSecureContext) {
      setGeoError('Location access requires a secure (HTTPS) connection.');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setGeoError('');
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          if (error.code === error.PERMISSION_DENIED) {
            setGeoError('Location permission denied. Please allow location access in browser settings.');
          } else if (error.code === error.TIMEOUT) {
            setGeoError('Location took too long. You can still submit your selfie.');
          } else {
            setGeoError('Unable to get location. You can still submit your selfie.');
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const setPreviewFromFile = (file) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (!file) {
      previewUrlRef.current = null;
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const clearSelection = () => {
    abortRef.current?.abort();
    genRef.current += 1;
    promiseRef.current = null;
    resultRef.current = null;
    setUploadResult(null);
    setUploadStatus('idle');
    setProgress(0);
    setSelfieFile(null);
    setPreviewFromFile(null);
  };

  const startSelfieUpload = (file) => {
    if (!file) return;
    abortRef.current?.abort();
    const generation = genRef.current + 1;
    genRef.current = generation;
    const controller = new AbortController();
    abortRef.current = controller;
    resultRef.current = null;
    setUploadResult(null);
    setSelfieFile(file);
    setUploadStatus('uploading');
    setProgress(0);
    setPreviewFromFile(file);

    const task = (async () => {
      try {
        const result = await uploadToS3(file, {
          folder: UPLOAD_FOLDERS.selfie,
          resourceType: 'image',
          compress: true,
          compressionOptions: { maxSizeMB: 2, maxWidthOrHeight: 1920 },
          signal: controller.signal,
          targetUserId: isAdminMode ? targetUserId : undefined,
          onProgress: (percent) => {
            if (genRef.current !== generation) return;
            setUploadStatus('uploading');
            setProgress(percent);
          },
        });
        if (genRef.current !== generation) return null;
        resultRef.current = result;
        setUploadResult(result);
        setUploadStatus('uploaded');
        setProgress(100);
        return result;
      } catch (err) {
        if (err instanceof UploadAbortedError || err?.name === 'UploadAbortedError') return null;
        if (genRef.current !== generation) return null;
        setUploadStatus('error');
        setProgress(0);
        setError(err.message || 'Selfie upload failed');
        throw err;
      }
    })();

    promiseRef.current = task;
    return task;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFieldErrors({});
    setError('');

    if (!selfieFile) {
      setFieldErrors({ selfie: 'Please select a selfie image' });
      setError('Please select a selfie image');
      return;
    }

    setIsSubmitting(true);
    setSuccess('');

    try {
      let result = resultRef.current || uploadResult;
      if (!result && promiseRef.current) {
        result = await promiseRef.current;
      }
      if (!result || !result.url) {
        throw new Error(uploadStatus === 'error' ? (error || 'Selfie upload failed') : 'Please wait for the selfie to finish uploading.');
      }

      const response = await kycAPI.saveSelfie({
        url: result.url,
        publicId: result.publicId,
        latitude: location.latitude,
        longitude: location.longitude,
        userId: targetUserId,
        targetUserId: targetUserId
      });

      if (response.status === 1) {
        setSuccess('Selfie uploaded successfully!');
        if (onSuccess) onSuccess(response.data);
      }
    } catch (err) {
      console.error(err);
      handleFormError(err, setFieldErrors, setError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StepLayout
      title="Selfie Verification"
      description="Upload a clear photo for identity verification."
      onClose={onClose}
      icon={Camera}
      footer={
        <Button
          onClick={handleSubmit}
          disabled={loading || !selfieFile || uploadStatus === 'error'}
          className="w-full h-12 text-sm font-black bg-zinc-950 hover:bg-black text-white shadow-xl shadow-zinc-100 rounded-lg transition-all active:scale-[0.98] uppercase tracking-wide"
        >
          {loading ? (
            <>
              <Spinner className="mr-2 text-white size-4" />
              {uploading ? `Uploading ${progress || 0}%` : 'Saving...'}
            </>
          ) : 'SUBMIT SELFIE'}
        </Button>
      }
    >
        {error && (
            <Alert variant="destructive" className="mb-4 py-2 rounded-lg border-red-100 bg-red-50/30">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <AlertDescription className="text-[10px] font-bold text-red-800 ml-1.5">{error}</AlertDescription>
            </Alert>
        )}
        {geoError && (
            <Alert variant="warning" className="mb-4 py-2 rounded-lg bg-amber-50/50 border-amber-100 text-amber-800">
                <AlertDescription className="text-[10px] font-bold">{geoError}</AlertDescription>
            </Alert>
        )}

        <VerificationCorrectionAlert 
           status={workflowStatus}
           reasonCode={workflowDetails.reasonCode}
           customerMessage={workflowDetails.customerMessage}
           retryCount={workflowDetails.retryCount}
           maxRetry={workflowDetails.maxRetry}
           onRetry={null} // Handled by submission
           customActionLabel="Re-take Selfie"
        />

        {success && (
            <div className="space-y-4 mb-4">
                <Alert variant="success" className="py-2 rounded-lg bg-green-50/50 border-green-100 text-green-800 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mr-1.5" />
                    <AlertDescription className="text-[10px]">{success}</AlertDescription>
                </Alert>
                {pickSelfieDisplayUrl(applicationData) && !selfieFile && (
                    <div className="relative rounded-lg overflow-hidden border-2 border-green-100 shadow-md animate-in fade-in zoom-in duration-500">
                        <img
                            src={getOptimizedUrl(pickSelfieDisplayUrl(applicationData), { width: 500 })}
                            alt="Existing Selfie"
                            className="w-full h-52 object-cover"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
                            <p className="inline-block text-center text-[9px] text-white font-black uppercase tracking-[0.2em] bg-green-600/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 mx-auto shadow-md">
                                PREVIOUSLY VERIFIED
                            </p>
                            <Button 
                                type="button" 
                                variant="secondary" 
                                className="w-full bg-white/95 hover:bg-white text-zinc-900 font-black rounded-lg h-9 text-xs shadow-lg"
                                onClick={() => {
                                    setSuccess('');
                                    setShowCamera(true);
                                }}
                            >
                                <Camera className="w-3.5 h-3.5 mr-1.5" />
                                RETAKE PHOTO
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {!showCamera ? (
          <div className="space-y-4">
            <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3.5 space-y-2.5 shadow-inner">
              <h4 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" /> Tips for a valid selfie
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Ensure good lighting on your face',
                  'Remove glasses, hat, or mask',
                  'Hold the phone at eye level',
                  'Keep a neutral expression'
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-zinc-50 shadow-sm">
                    <div className="w-1 h-1 bg-white rounded-full shrink-0" /> 
                    <span className="text-[10px] text-zinc-600 font-bold">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                        setShowCamera(true);
                        if (fieldErrors.selfie) setFieldErrors(prev => ({ ...prev, selfie: '' }));
                    }}
                    className={`group relative h-28 flex flex-col items-center justify-center gap-2 bg-white border-2 rounded-lg hover:border-zinc-900 hover:shadow-lg transition-all duration-300 active:scale-[0.98] ${fieldErrors.selfie ? "border-red-500" : "border-zinc-100"}`}
                  >
                    <div className="p-3 bg-zinc-950 text-white rounded-lg group-hover:scale-105 transition-transform shadow-md shadow-zinc-200">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                        <span className="block text-xs font-black text-zinc-900 uppercase tracking-tight">Take Selfie</span>
                        <span className="block text-[8px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">LIVE CAMERA</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                        document.getElementById('selfie-file-input').click();
                        if (fieldErrors.selfie) setFieldErrors(prev => ({ ...prev, selfie: '' }));
                    }}
                    className={`group relative h-28 flex flex-col items-center justify-center gap-2 bg-white border-2 rounded-lg hover:border-zinc-900 hover:shadow-lg transition-all duration-300 active:scale-[0.98] ${fieldErrors.selfie ? "border-red-500" : "border-zinc-100"}`}
                  >
                    <div className="p-3 bg-zinc-50 text-zinc-900 rounded-lg group-hover:scale-105 transition-transform shadow-sm">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                         <span className="block text-xs font-black text-zinc-900 uppercase tracking-tight">Upload Photo</span>
                         <span className="block text-[8px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">FROM GALLERY</span>
                    </div>
                  </button>
                </div>
                {fieldErrors.selfie && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.selfie}</p>}

                <input
                  id="selfie-file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setError('');
                      startSelfieUpload(file);
                      if (fieldErrors.selfie) setFieldErrors(prev => ({ ...prev, selfie: '' }));
                  }}
                  className="hidden"
                />

                {selfieFile && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative rounded-lg overflow-hidden border-2 border-zinc-900/10 shadow-md">
                      <img
                        src={previewUrl}
                        alt="Selfie preview"
                        className="w-full h-52 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="absolute top-3 right-3 bg-white/95 hover:bg-red-600 hover:text-white text-red-600 rounded-lg p-2 shadow-md transition-all backdrop-blur-md border border-white/20 active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-3 left-3 right-3 text-center">
                        <p className="inline-block text-[10px] text-white font-black truncate bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest shadow-lg">
                          {uploading ? `Uploading ${progress || 0}%` : uploadStatus === 'uploaded' ? 'Ready to submit' : `📸 ${selfieFile.name}`}
                        </p>
                      </div>
                    </div>
                    {uploading && (
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden border border-zinc-50">
                        <div
                          className="bg-zinc-900 h-full transition-all duration-300 ease-out"
                          style={{ width: `${Math.max(progress || 0, 8)}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>

            {loading && progress > 0 && !selfieFile && (
              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden border border-zinc-50">
                <div 
                  className="bg-white h-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
        </div>
        ) : (
          <div className="rounded-lg overflow-hidden shadow-lg border border-zinc-100 bg-black">
            <CameraCapture
              onCapture={(file) => {
                setError('');
                startSelfieUpload(file);
                setShowCamera(false);
                if (fieldErrors.selfie) setFieldErrors(prev => ({ ...prev, selfie: '' }));
              }}
              onClose={() => setShowCamera(false)}
            />
          </div>
        )}
    </StepLayout>
  );
}