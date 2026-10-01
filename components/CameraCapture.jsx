import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCw } from 'lucide-react';

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isFacingUser, setIsFacingUser] = useState(true);
  const [error, setError] = useState('');

  const streamRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    const startCamera = async () => {
      try {
        setError('');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (!ignore) setError('Camera access is not supported by your browser or requires a secure (HTTPS) connection.');
          return;
        }

        const constraints = {
          video: {
            facingMode: isFacingUser ? 'user' : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        
        let mediaStream;
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
            console.warn('Initial camera constraints failed, trying generic...', initialErr.name);
            // Fallback: Try without specific facingMode or resolution if it failed
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (ignore) {
            mediaStream.getTracks().forEach(track => track.stop());
            return;
        }

        setStream(mediaStream);
        streamRef.current = mediaStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (ignore) return;

        if (!window.isSecureContext) {
            setError('Camera access requires a secure connection (HTTPS). Testing on HTTP over local network is blocked by mobile browsers.');
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(
            'Camera permission denied. Allow camera in browser site settings (lock icon in the address bar), then refresh. ' +
            'If it still fails, the site server may block camera — ask admin to set nginx Permissions-Policy to camera=(self).'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is already in use by another application or tab.');
        } else {
          setError('Unable to access camera: ' + (err.message || 'Unknown error'));
        }
      }
    };

    startCamera();

    return () => {
      ignore = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isFacingUser, retryCount]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;

      if (!width || !height) {
        setError('Camera is still starting. Please wait a moment and tap capture again.');
        return;
      }

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      context.drawImage(videoRef.current, 0, 0, width, height);

      canvasRef.current.toBlob((blob) => {
        if (!blob || blob.size === 0) {
          setError('Could not capture the photo. Please try again.');
          return;
        }

        // Some browsers ignore the requested JPEG type and return PNG
        const isPng = blob.type === 'image/png';
        const file = new File([blob], isPng ? 'selfie.png' : 'selfie.jpg', {
          type: isPng ? 'image/png' : 'image/jpeg',
        });

        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        onCapture(file);
      }, 'image/jpeg', 0.95);
    }
  };

  const handleToggleCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsFacingUser(!isFacingUser);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setRetryCount(prev => prev + 1)} 
              className="text-xs h-8 border-red-200 hover:bg-red-100 flex-1"
            >
              <RotateCw className="w-3 h-3 mr-1" /> Try Again
            </Button>
          </div>
        </div>
      )}
      
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 border-4 border-yellow-400 border-opacity-30 pointer-events-none" />
        <div className="absolute top-4 left-4 right-4">
          <div className="text-white text-center text-sm font-medium">
            Position your face in the frame
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-2">
        <Button
          onClick={handleToggleCamera}
          variant="outline"
          className="flex-1 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
        >
          <RotateCw className="w-4 h-4 mr-2" />
          Switch Camera
        </Button>
        <Button
          onClick={handleCapture}
          className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Camera className="w-4 h-4 mr-2" />
          Capture Photo
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1 border-gray-300 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
