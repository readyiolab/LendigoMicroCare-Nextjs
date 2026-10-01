import React, { useRef, useEffect } from 'react';
import { Camera, Upload, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StaffPhotoCard({ avatarUrl, onAvatarChange }) {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [stream, setStream] = React.useState(null);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  useEffect(() => () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }, [stream]);

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      setCameraOpen(true);
    } catch {
      alert('Could not access camera. Please check permissions.');
    }
  };

  useEffect(() => {
    if (cameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraOpen, stream]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob && onAvatarChange) {
        onAvatarChange(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      }
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) onAvatarChange(file);
  };

  return (
    <section className="rounded-md border border-slate-300 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-300">
        <h2 className="text-sm font-semibold text-slate-900">Photo</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-md border border-slate-300 overflow-hidden bg-white flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 text-sm rounded-md border-slate-300"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" /> Upload Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 text-sm rounded-lg border-slate-200"
              onClick={openCamera}
            >
              <Camera className="w-4 h-4 mr-2" /> Open Camera
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {cameraOpen && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Camera preview</p>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={stopCamera}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-lg bg-black aspect-video" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="h-10 px-4 text-sm" onClick={stopCamera}>
                Cancel
              </Button>
              <Button type="button" className="h-10 px-4 text-sm bg-slate-900 text-white hover:bg-slate-800" onClick={capturePhoto}>
                Capture
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
