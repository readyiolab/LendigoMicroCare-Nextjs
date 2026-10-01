import { memo } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, Upload, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { EMPTY_SLOT } from './slotHelpers';

const UploadSlot = memo(({ label, field, slot, onFileChange, onRemove, onRetry }) => {
  const { preview, previewKind, file, status, progress, error } = slot || EMPTY_SLOT;
  const busy = status === 'optimizing' || status === 'uploading';
  const done = status === 'uploaded';
  const failed = status === 'error';

  return (
    <div className="space-y-1">
      <div
        className={`group relative h-22 rounded-lg border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-1.5 cursor-pointer
          ${failed ? 'border-red-200 bg-red-50/20' : done ? 'border-green-200 bg-green-50/20' : busy ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-100 bg-zinc-50/20 hover:border-zinc-200 hover:bg-zinc-50'}
        `}
        onClick={() => !preview && document.getElementById(`${field}Input`).click()}
      >
        {preview ? (
          <>
            <div className="absolute inset-0 z-0">
              {preview === 'pdf' || previewKind === 'pdf' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white/50">
                  <FileText className="w-6 h-6 text-red-500 mb-0.5" />
                  <span className="text-[8px] font-black text-slate-500">PDF DOC</span>
                </div>
              ) : (
                <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-80" />
              )}
            </div>
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center bg-white/40 backdrop-blur-[1px] p-2 text-center">
              {busy ? (
                <>
                  <Spinner className="w-5 h-5 text-zinc-900 mb-0.5" />
                  <span className="text-[9px] font-black text-zinc-800 uppercase tracking-tight">
                    {status === 'optimizing' ? 'Optimizing' : `Uploading ${progress}%`}
                  </span>
                  <div className="mt-1 h-1 w-20 rounded-full bg-white/80 overflow-hidden">
                    <div className="h-full bg-zinc-900 transition-all" style={{ width: `${Math.max(progress, 8)}%` }} />
                  </div>
                </>
              ) : failed ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600 mb-0.5" />
                  <span className="text-[9px] font-black text-red-700 uppercase tracking-tight truncate max-w-full px-2">
                    {error || 'Upload failed'}
                  </span>
                  <button
                    type="button"
                    className="mt-1 px-2 py-0.5 bg-white rounded-lg shadow-sm text-[8px] font-black uppercase text-zinc-900"
                    onClick={(e) => { e.stopPropagation(); onRetry(); }}
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600 mb-0.5 drop-shadow-sm" />
                  <span className="text-[9px] font-black text-green-800 uppercase tracking-tight truncate max-w-full px-2">
                    {file ? file.name : 'Uploaded'}
                  </span>
                </>
              )}
              <button
                type="button"
                className="mt-1 p-1 bg-white rounded-lg shadow-sm text-red-500 hover:bg-red-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 group-hover:scale-105 transition-transform">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">{label}</p>
              <p className="text-[8px] text-slate-500 font-medium">Click to upload</p>
            </div>
          </>
        )}
        <input
          type="file"
          id={`${field}Input`}
          className="hidden"
          onChange={(e) => onFileChange(field, e.target.files[0])}
          accept="image/*,application/pdf"
        />
      </div>
    </div>
  );
});

export default UploadSlot;
