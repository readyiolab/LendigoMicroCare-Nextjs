import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from '@/lib/router';
import { kycAPI } from '@/lib/api/kyc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Video
} from 'lucide-react';

export default function VerifySelfie() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Workflow states: 'verifying_token', 'invalid_token', 'ready', 'capturing', 'preview', 'uploading', 'verified', 'failed'
  const [status, setStatus] = useState('verifying_token');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const [geo, setGeo] = useState({ latitude: null, longitude: null });
  const [geoLoading, setGeoLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [pipelineResult, setPipelineResult] = useState(null);

  // WebRTC refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 1. Verify token on page load
  useEffect(() => {
    if (!token) {
      setStatus('invalid_token');
      setError('A secure verification token is required to access this portal.');
      return;
    }
    verifyLink();
  }, [token]);

  const verifyLink = async () => {
    setStatus('verifying_token');
    try {
      const response = await kycAPI.magicVerify(token);
      if (response.status === 1 && response.data.valid) {
        setCustomerName(response.data.name);
        setStatus('ready');
        // Request geolocation early for smooth performance
        requestLocation();
      } else {
        setStatus('invalid_token');
        setError(response.message || 'This verification link is invalid or has expired.');
      }
    } catch (err) {
      setStatus('invalid_token');
      setError(err.message || 'Failed to authenticate this secure verification link.');
    }
  };

  // 2. Geolocation Request
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGeoLoading(false);
      },
      (err) => {
        console.warn('Geolocation permission declined:', err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  // 3. Camera Controls
  const startCamera = async () => {
    setStatus('capturing');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 1280, min: 640 },
          aspectRatio: 1
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Unable to access camera. Please ensure camera permissions are enabled in your browser settings.');
      setStatus('ready');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Capture frame from WebRTC video
  const captureFrame = () => {
    if (!videoRef.current) return;

    const vw = videoRef.current.videoWidth || 1280;
    const vh = videoRef.current.videoHeight || 1280;
    const size = Math.min(Math.max(vw, vh, 720), 1280);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Draw mirrored video if browser shows mirrored stream
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    
    // Re-check geolocation to make sure we lock coordinates precisely on capture
    requestLocation();
    
    stopCamera();
    setStatus('preview');
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Helper: Convert base64 DataURL to File object for Upload
  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // 4. Submit captured selfie to server
  const handleUpload = async () => {
    if (!capturedImage) return;
    setStatus('uploading');
    setError('');

    try {
      const file = dataURLtoFile(capturedImage, `selfie_${Date.now()}.jpg`);
      const formData = new FormData();
      formData.append('selfie', file);
      formData.append('token', token);
      
      if (geo.latitude && geo.longitude) {
        formData.append('latitude', geo.latitude);
        formData.append('longitude', geo.longitude);
      }

      const response = await kycAPI.magicUploadSelfie(formData);

      if (response.status === 1) {
        setPipelineResult(response.data);
        if (response.data.verified) {
          setStatus('verified');
        } else {
          setStatus('failed');
          setError(response.data.message || 'We could not complete verification. Please try again.');
        }
      } else {
        setStatus('failed');
        setError(response.message || 'Verification failed. Please contact your loan administrator.');
      }
    } catch (err) {
      setStatus('failed');
      setError(err.message || 'Failed to submit media. Please check your internet connection and try again.');
    }
  };

  // Auto clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-white selection:text-black">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse duration-[8000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse duration-[6000ms]"></div>
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-black tracking-tighter text-lg shadow-lg shadow-white/10">
            L
          </div>
          <span className="font-extrabold tracking-tight text-lg text-white">Lendigo<span className="text-emerald-400">MicroCare</span></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>AES-256 Encrypted</span>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-10 w-full max-w-lg mx-auto">
        <div className="w-full bg-white/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-lg shadow-2xl relative overflow-hidden">
          
          {/* Card Border Flare */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Core Content Switching States */}

          {/* STATE 1: LOADING SECURE TOKEN */}
          {status === 'verifying_token' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-white">Verifying Secure Link</h3>
                <p className="text-sm text-slate-500">Establishing handshake & fetching application rules...</p>
              </div>
            </div>
          )}

          {/* STATE 2: INVALID/EXPIRED SECURE TOKEN */}
          {status === 'invalid_token' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-xl text-white">Expired or Invalid Link</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                  {error || 'This link has expired or has already been used. Magic links can only be accessed once for security reasons.'}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-xs text-slate-500">Please request a new selfie retake link from your Lendigo operations agent.</p>
              </div>
            </div>
          )}

          {/* STATE 3: READY / LANDING PAGE */}
          {status === 'ready' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Selfie Retake Triggered
                </div>
                <h3 className="font-extrabold text-2xl text-white">Hi, {customerName || 'Customer'}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Our credit underwriters requested a selfie retake to verify your identity. Let's capture a new high-quality photo.
                </p>
              </div>

              {/* Tips Grid */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-3.5 text-sm">
                <h4 className="font-bold text-slate-600 text-xs tracking-wider uppercase">Keys for quick AI approval:</h4>
                <div className="grid grid-cols-1 gap-2.5 text-slate-500">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                    <p>Good lighting: Avoid backlights or dark shadows.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                    <p>Clear view: Remove glasses, hats, or face masks.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                    <p>Stable posture: Look directly at the center of the camera.</p>
                  </div>
                </div>
              </div>

              {geoLoading && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Locking GPS Coordinates...
                </div>
              )}

              {geo.latitude && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400/80 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Geolocation Locked ({geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)})</span>
                </div>
              )}

              <Button 
                onClick={startCamera} 
                className="w-full h-14 rounded-lg bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Camera className="w-5 h-5" />
                Open Camera Feed
              </Button>
            </div>
          )}

          {/* STATE 4: WEBRTC CAMERA ACTIVE */}
          {status === 'capturing' && (
            <div className="space-y-6 flex flex-col items-center animate-in fade-in duration-300">
              <div className="space-y-1 text-center">
                <h3 className="font-bold text-lg text-white">Capture Live Photo</h3>
                <p className="text-xs text-slate-500">Position your face inside the overlay indicator</p>
              </div>

              {/* Camera Portal with Oval Guides */}
              <div className="relative w-72 h-72 rounded-full overflow-hidden border-2 border-dashed border-zinc-700/50 bg-black shadow-inner flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Face Alignment Overlay Oval */}
                <div className="absolute inset-4 rounded-[40%/50%] border-2 border-emerald-400/50 pointer-events-none flex items-center justify-center bg-transparent shadow-[0_0_0_200px_rgba(9,9,11,0.6)]">
                  <div className="w-[105%] h-[105%] rounded-[40%/50%] border border-dashed border-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full pt-2">
                <Button 
                  onClick={() => {
                    stopCamera();
                    setStatus('ready');
                  }} 
                  variant="outline" 
                  className="flex-1 h-12 rounded-lg border-white/10 hover:bg-white/5 text-slate-500 hover:text-white transition-all text-sm font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={captureFrame} 
                  className="flex-1 h-12 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Capture Photo
                </Button>
              </div>
            </div>
          )}

          {/* STATE 5: PREVIEW CAPTURED PICTURE */}
          {status === 'preview' && (
            <div className="space-y-6 flex flex-col items-center animate-in zoom-in-95 duration-300">
              <div className="space-y-1 text-center">
                <h3 className="font-bold text-lg text-white">Review Captured Photo</h3>
                <p className="text-xs text-slate-500">Confirm it is sharp, well-lit, and matches your official identity card.</p>
              </div>

              {/* Capture Preview Round Frame */}
              <div className="relative w-72 h-72 rounded-full overflow-hidden border-2 border-white/10 bg-black shadow-2xl">
                <img 
                  src={capturedImage} 
                  alt="Captured Selfie" 
                  className="w-full h-full object-cover"
                />
              </div>

              {geo.latitude && (
                <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Location Attached ({geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)})</span>
                </div>
              )}

              <div className="flex items-center gap-4 w-full pt-2">
                <Button 
                  onClick={handleRetake} 
                  variant="outline" 
                  className="flex-1 h-12 rounded-lg border-white/10 hover:bg-white/5 text-slate-500 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Photo
                </Button>
                <Button 
                  onClick={handleUpload} 
                  className="flex-1 h-12 rounded-lg bg-white hover:bg-zinc-150 text-zinc-950 font-bold text-sm shadow-lg transition-all"
                >
                  Confirm & Upload
                </Button>
              </div>
            </div>
          )}

          {/* STATE 6: UPLOADING & PIPELINE RUNNING */}
          {status === 'uploading' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              
              {/* Pulse Scanner Visual Aid */}
              <div className="relative w-44 h-44 rounded-full overflow-hidden border border-emerald-500/30 flex items-center justify-center bg-emerald-500/5">
                <img 
                  src={capturedImage} 
                  alt="Selfie processing" 
                  className="w-full h-full object-cover opacity-60 filter blur-[1px]"
                />
                {/* Glowing AI Scanning Bar */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400 to-transparent h-10 w-full opacity-60 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>

              <style>{`
                @keyframes scan {
                  0% { transform: translateY(-100%); }
                  50% { transform: translateY(150%); }
                  100% { transform: translateY(-100%); }
                }
              `}</style>

              <div className="space-y-2">
                <h3 className="font-extrabold text-xl text-white">Evaluating Identity Checks</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                  Executing biometrics, face matching, and real-time liveness checks. Do not refresh or exit.
                </p>
              </div>
            </div>
          )}

          {/* STATE 7: FULLY VERIFIED (SUCCESS) */}
          {status === 'verified' && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-2xl text-white">Selfie Verified!</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                  Excellent, {customerName || 'Customer'}. The AI pipeline matching scored {pipelineResult?.matchScore ? `${pipelineResult.matchScore}%` : 'perfectly'} and your liveness status is confirmed.
                </p>
              </div>
              
              <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-lg p-4 w-full text-xs text-emerald-300 font-medium leading-relaxed max-w-sm">
                Your loan application has been automatically updated in our core banking ledger. Our underwriting team has been notified. You can safely close this browser window now.
              </div>
            </div>
          )}

          {/* STATE 8: PARTIAL OR FULL FAILURE */}
          {status === 'failed' && (
            <div className="space-y-5 flex flex-col items-center animate-in zoom-in-95 duration-300">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center border',
                pipelineResult?.faceMatch === 'PASSED'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              )}>
                <XCircle className="w-8 h-8" />
              </div>
              
              <div className="space-y-1.5 text-center px-2">
                <h3 className="font-extrabold text-xl text-white">
                  {pipelineResult?.faceMatch === 'PASSED' ? 'Almost done' : 'Photo not accepted'}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {pipelineResult?.faceMatch === 'PASSED'
                    ? 'You are the right person (ID matched). We only need a clearer live selfie.'
                    : 'Please take a new photo so we can match your face with your ID.'}
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/5 border-red-500/25 text-red-300 rounded-lg">
                  <AlertDescription className="text-sm font-medium leading-relaxed">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-2.5 w-full text-sm text-slate-500">
                <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                  <span>Same person as Aadhaar?</span>
                  <span className={`font-bold ${pipelineResult?.faceMatch === 'PASSED' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pipelineResult?.faceMatch === 'PASSED' ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Live selfie (not a photo of photo)?</span>
                  <span className={`font-bold ${pipelineResult?.liveness === 'PASSED' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pipelineResult?.liveness === 'PASSED' ? 'Yes' : 'Try again'}
                  </span>
                </div>
              </div>

              {pipelineResult?.faceMatch === 'PASSED' && pipelineResult?.liveness !== 'PASSED' && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 w-full text-sm text-amber-100/90 space-y-2">
                  <p className="font-semibold text-amber-200">Tips for mobile:</p>
                  <ul className="list-disc pl-4 space-y-1 text-amber-100/80">
                    <li>Stand facing a window or lamp — avoid dark room or strong backlight</li>
                    <li>Hold phone at eye level, look straight at the camera</li>
                    <li>Remove sunglasses; blink once, then capture</li>
                    <li>Do not upload a screenshot or old photo from gallery</li>
                  </ul>
                </div>
              )}

              {pipelineResult?.canRetrySameLink !== false && (
                <Button 
                  onClick={handleRetake} 
                  className="w-full h-12 rounded-lg bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Take another selfie
                </Button>
              )}

              {pipelineResult?.faceMatch === 'PASSED' && (
                <p className="text-xs text-slate-500 text-center leading-relaxed px-2">
                  Or wait — our loan team can approve your selfie from the office (you do not need to do anything).
                </p>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between py-6 border-t border-white/5 text-xs text-slate-500 gap-4">
        <p>© 2026 Lendigo Microcare Fintech Ltd. All rights reserved.</p>
        <div className="flex items-center gap-4 font-semibold">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Support Helpline</a>
        </div>
      </footer>
    </div>
  );
}
