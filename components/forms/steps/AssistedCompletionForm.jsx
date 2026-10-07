import { adminAPI } from '@/lib/api';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, Home, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import StepLayout from './StepLayout';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AssistedCompletionForm({ onSuccess, onClose, applicationId, targetUserId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.submitAssistedApplication({
        applicationId,
        targetUserId,
        isFinal: true
      });

      if (response.status === 1) {
        if (onSuccess) onSuccess();
      } else {
        setError(response.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during submission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepLayout
      title="Final Submission"
      description="All verification steps are complete."
      onClose={onClose}
      icon={Sparkles}
      footer={
        <Button 
            onClick={handleSubmit} 
            disabled={loading}
            loading={loading}
            className="w-full h-12 text-sm font-black bg-zinc-950 hover:bg-black text-white shadow-xl shadow-zinc-100 rounded-lg transition-all active:scale-[0.98]"
        >
            FINAL SUBMIT APPLICATION
            <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      }
    >
        <div className="flex flex-col items-center justify-center py-10 space-y-10 text-center">
            <div className="relative">
                <div className="p-8 bg-zinc-950 text-white rounded-lg shadow-2xl shadow-zinc-200 animate-in zoom-in-50 duration-700">
                    <CheckCircle2 className="w-20 h-20" />
                </div>
                <div className="absolute -top-3 -right-3 p-3 bg-white border border-zinc-100 rounded-lg shadow-xl animate-bounce">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight leading-none uppercase">Ready to finalize</h2>
                <p className="text-[13px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Great progress! All application steps have been successfully validated. You are now one step away from finishing the assisted process.
                </p>
            </div>

            {error && (
                <Alert variant="destructive" className="py-3 rounded-lg border-red-100 bg-red-50/30 max-w-sm">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-xs font-bold text-red-800 ml-2">{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-lg flex flex-col items-center gap-2 shadow-inner">
                    <ShieldCheck className="w-5 h-5 text-slate-500" />
                    <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Secured</p>
                </div>
                <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-lg flex flex-col items-center gap-2 shadow-inner">
                    <Home className="w-5 h-5 text-slate-500" />
                    <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Verified</p>
                </div>
            </div>

            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live validation pipeline active
            </p>
        </div>
    </StepLayout>
  );
}
