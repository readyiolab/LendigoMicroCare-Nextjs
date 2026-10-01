import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Camera,
  Square,
  RotateCcw,
  CheckCircle2,
  VideoOff,
  Mic,
  ChevronRight,
} from 'lucide-react';

const MAX_RECORDING_TIME = 90;
const PLACEHOLDER = '____';
const COMPANY_NAME = 'Lendigo Microcare ';

const STEPS = [
  { id: 'record', label: 'Record' },
  { id: 'review', label: 'Review' },
];

function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return PLACEHOLDER;
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return PLACEHOLDER;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return PLACEHOLDER;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildDeclarationScript({
  customerName,
  sanctionDate,
  loanAmount,
  repayAmount,
  repayDate,
} = {}) {
  const name = (customerName && String(customerName).trim()) || PLACEHOLDER;
  const sanction = formatDate(sanctionDate);
  const loan = formatAmount(loanAmount);
  const repay = formatAmount(repayAmount);
  const due = formatDate(repayDate);

  return [
    `MY NAME IS ${name} AND I AM TAKING A LOAN FROM ${COMPANY_NAME} ON DATE ${sanction}`,
    `MY LOAN AMOUNT IS ${loan}`,
    `MY REPAY AMOUNT IS ${repay}`,
    `MY REPAY DATE IS ${due}`,
    `AND I AM PROMISE TO PAY ON DUE DATE`,
    `AND IF I DON'T PAY MY LOAN ON DUE DATE THEN COMPANY EXECUTIVE WILL COME TO MY HOME AND OFFICE, I DON'T HAVE ANY OBJECTION`,
    `THANK YOU`,
  ].join('\n');
}

const ReadAloudBanner = ({ script, compact = false }) => (
  <div
    className={cn(
      'rounded-lg border border-slate-200 bg-slate-50',
      compact ? 'p-3' : 'p-4'
    )}
  >
    <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
      <Mic className="h-3.5 w-3.5 shrink-0" />
      Read aloud while recording
    </p>
    <p
      className={cn(
        'font-medium text-slate-900 leading-relaxed whitespace-pre-line',
        compact ? 'text-sm' : 'text-base'
      )}
    >
      &ldquo;{script}&rdquo;
    </p>
  </div>
);

function getBestVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return '';
}

const VideoDeclaration = ({
  onVideoReady,
  onStepChange,
  onRetry,
  customerName,
  sanctionDate,
  loanAmount,
  repayAmount,
  repayDate,
}) => {
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [step, setStep] = useState('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const declarationScript = useMemo(
    () =>
      buildDeclarationScript({
        customerName,
        sanctionDate,
        loanAmount,
        repayAmount,
        repayDate,
      }),
    [customerName, sanctionDate, loanAmount, repayAmount, repayDate]
  );

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  const startCamera = useCallback(async (isCancelled) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (isCancelled && isCancelled()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setError('');
      setPermissionDenied(false);
    } catch (err) {
      if (isCancelled && isCancelled()) return;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Please allow camera and microphone access, then tap Allow camera below.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not open camera. Try another browser or device.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = getBestVideoMimeType();

    let mediaRecorder;
    try {
      // 1.0 Mbps provides high visual quality for 480p/720p portrait declaration
      // while guaranteeing that even a full 90-second video stays around ~10-12 MB.
      mediaRecorder = new MediaRecorder(streamRef.current, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 1000000,
        audioBitsPerSecond: 64000,
      });
    } catch {
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, {
          ...(mimeType ? { mimeType } : {}),
          bitsPerSecond: 1000000,
        });
      } catch {
        mediaRecorder = mimeType
          ? new MediaRecorder(streamRef.current, { mimeType })
          : new MediaRecorder(streamRef.current);
      }
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const actualMime = mediaRecorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: actualMime });
      setRecordedBlob(blob);
      stopCamera();
      if (previewRef.current) {
        previewRef.current.src = URL.createObjectURL(blob);
      }
      setStep('review');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
  }, [stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, stopRecording]);

  useEffect(() => {
    let cancelled = false;
    if (step === 'record') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCamera(() => cancelled).catch((err) => {
        if (!cancelled) console.error('Failed to start camera:', err);
      });
    }
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [step, startCamera, stopCamera]);

  const handleRetry = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setSubmitted(false);
    setIsRecording(false);
    if (previewRef.current) previewRef.current.src = '';
    setStep('record');
    onRetry?.();
  };

  const handleSubmit = () => {
    if (!recordedBlob || !onVideoReady) return;
    stopCamera();
    const recordedMime = recordedBlob.type || mediaRecorderRef.current?.mimeType || '';
    const isMp4 = recordedMime.toLowerCase().includes('mp4');
    const actualMime = isMp4 ? 'video/mp4' : 'video/webm';
    const ext = isMp4 ? 'mp4' : 'webm';
    const properBlob = new Blob([recordedBlob], { type: actualMime });
    const file = new File([properBlob], `video_declaration.${ext}`, { type: actualMime });
    setSubmitted(true);
    onVideoReady(file);
  };

  const progressPercent = Math.min(100, (recordingTime / MAX_RECORDING_TIME) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = s.id === 'record' && step === 'review';
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold',
                  done ? 'bg-slate-900 text-white' : active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-xs font-medium', active ? 'text-slate-900' : 'text-slate-500')}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-600" />}
            </div>
          );
        })}
      </div>

      {step === 'record' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {cameraReady ? (
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                'w-full h-9 rounded-lg text-xs font-semibold',
                isRecording ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-950 text-white hover:bg-black'
              )}
            >
              {isRecording ? (
                <>
                  <Square className="mr-1.5 h-3.5 w-3.5" /> Stop recording
                </>
              ) : (
                <>
                  <Camera className="mr-1.5 h-3.5 w-3.5" /> Start recording
                </>
              )}
            </Button>
          ) : (
            !permissionDenied && (
              <div className="flex h-9 w-full items-center justify-center rounded-lg bg-zinc-100 text-xs text-slate-500">
                Opening camera…
              </div>
            )
          )}

          <ReadAloudBanner script={declarationScript} compact />

          <div className="relative aspect-video overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-zinc-200">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover scale-x-[-1]"
            />
            {isRecording && (
              <>
                <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
                </div>
                <div className="absolute bottom-0 left-0 right-0 max-h-[55%] overflow-y-auto bg-gradient-to-t from-black/90 via-black/75 to-transparent p-3 pt-8 pointer-events-auto">
                  <p className="text-xs font-medium text-slate-300 mb-1">Say this now</p>
                  <p className="text-xs text-white leading-snug whitespace-pre-line">{declarationScript}</p>
                </div>
              </>
            )}
            {permissionDenied && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 p-6 text-center text-white z-10">
                <VideoOff className="mb-3 h-10 w-10 text-slate-500" />
                <p className="mb-4 text-sm">{error}</p>
                <Button size="sm" variant="secondary" onClick={() => { startCamera().catch(console.error); }}>
                  Allow camera
                </Button>
              </div>
            )}
          </div>

          {isRecording && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            {isRecording
              ? 'Read the declaration while looking at the camera'
              : 'Tap Start recording above, then read the text aloud'}
          </p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {submitted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800 font-medium">
              Video ready — tap &ldquo;Submit & accept offer&rdquo; below to finish.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-lg text-xs"
                  onClick={handleRetry}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Re-record
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 h-9 rounded-lg text-xs bg-zinc-950 text-white hover:bg-black"
                  onClick={handleSubmit}
                  disabled={Boolean(recordedBlob && recordedBlob.size > 100 * 1024 * 1024)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Use this video
                </Button>
              </div>
              {recordedBlob && (
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
                  <span>Duration: {Math.floor(recordingTime / 60)}m {recordingTime % 60}s</span>
                  <span>Size: {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              )}
              {recordedBlob && recordedBlob.size > 100 * 1024 * 1024 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  Video is too large ({(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB). Max allowed size is 100 MB. Please tap Re-record.
                </div>
              )}
            </div>
          )}

          <ReadAloudBanner script={declarationScript} compact />
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black shadow-md">
            <video ref={previewRef} controls playsInline className="h-full w-full object-cover" />
          </div>
        </div>
      )}

      {error && !permissionDenied && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default VideoDeclaration;
