import { memo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';

const VideoVerificationSection = memo(({ onVerify, updating, canVerify = true, verifiedLabel = 'Video verified' }) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (!canVerify) {
    return (
      <div className="w-full md:w-64 flex flex-col gap-3 relative z-20">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 font-medium flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{verifiedLabel}</p>
            <p className="text-xs font-normal text-emerald-700 mt-1">
              Declaration already accepted. No further video verification is needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-64 flex flex-col gap-3 relative z-20">
        <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs text-amber-900 mb-2 shadow-sm">
            <strong>Checklist:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Face clearly visible</li>
                <li>Audio audible</li>
                <li>Consent statement clear</li>
            </ul>
        </div>

        {isRejecting ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <Textarea 
                    placeholder="Reason for rejection..."
                    className="text-xs h-20 bg-white border-red-100 focus:border-red-300 focus:ring-red-100"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                />
                <div className="flex gap-2">
                    <Button 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-9 relative z-20"
                        disabled={updating || !reason.trim()}
                        loading={updating}
                        onClick={() => {
                            onVerify(false, reason.trim());
                        }}
                    >
                        Confirm Reject
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="text-xs h-9 text-gray-500"
                        onClick={() => {
                            setIsRejecting(false);
                            setReason('');
                        }}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        ) : (
            <div className="flex flex-col gap-2 relative z-20">
                <Button 
                    className="bg-green-600 hover:bg-green-700 text-white shadow-md w-full h-10 relative z-20"
                    disabled={updating}
                    loading={updating}
                    onClick={() => onVerify(true)}
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verify & Next
                </Button>
                <Button 
                    variant="outline" 
                    className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400 w-full h-10 relative z-20 bg-white"
                    disabled={updating}
                    onClick={() => setIsRejecting(true)}
                >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                </Button>
            </div>
        )}
    </div>
  );
});

VideoVerificationSection.displayName = 'VideoVerificationSection';
export default VideoVerificationSection;
