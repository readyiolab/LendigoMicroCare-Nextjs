import { Button } from '@/components/ui/button';
import { Camera, Mic, Sun, Video, Loader2 } from 'lucide-react';

const TIPS = [
  { icon: Sun, title: 'Good lighting', text: 'Face the light' },
  { icon: Video, title: 'Clear face', text: 'Full face in frame' },
  { icon: Mic, title: 'Read aloud', text: 'Speak slowly' },
];

export default function VideoDeclarationRejectedCard({
  rejectionReason,
  onRecordAgain,
  uploading = false,
}) {
  const reason = (rejectionReason || '').trim();

  return (
    <div className="max-w-3xl mx-auto mb-6">
      <div className="rounded-lg border border-red-200/80 bg-white shadow-sm p-4 space-y-3">
        {/* Action first — visible without scrolling */}
        <Button
          type="button"
          onClick={onRecordAgain}
          disabled={uploading}
          size="sm"
          className="w-full h-9 rounded-lg bg-zinc-950 text-white hover:bg-black text-xs font-semibold"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Uploading video…
            </>
          ) : (
            <>
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              Record new video
            </>
          )}
        </Button>

        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-900">Video needs to be recorded again</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              We could not approve your last video. Check feedback and tips below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {reason && (
            <div className="col-span-2 sm:col-span-4 rounded-lg border border-red-100 bg-red-50/70 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-800/80">
                Team feedback
              </p>
              <p className="text-xs text-zinc-800 mt-0.5 leading-snug">{reason}</p>
            </div>
          )}

          {TIPS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2 flex items-start gap-2"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-900 leading-none">{title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-center text-slate-500">Up to ~90 sec · Camera & microphone required</p>
      </div>
    </div>
  );
}
