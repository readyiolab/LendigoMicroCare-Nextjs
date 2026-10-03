import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from '@/lib/router';
import { format } from 'date-fns';
import { adminAPI } from '@/lib/api';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { dsaPartnerHomePath, isDsaPartnerRole } from '@/components/admin/DsaPartnerRouteGuard';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  CheckCircle2,
  User,
  Briefcase,
  MapPin,
  IndianRupee,
  ChevronLeft,
  Camera,
  Fingerprint,
  Home,
  Users,
  Banknote,
  FileUp,
  FileText,
  ShieldCheck,
  Zap,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';

// Import adapted step forms
import EligibilityForm from '@/components/forms/steps/EligibilityForm';
import SelfieForm from '@/components/forms/steps/SelfieForm';
import EkycVerificationForm from '@/components/forms/steps/EkycVerificationForm';
import ResidenceProofForm from '@/components/forms/steps/ResidenceProofForm';
import ReferenceForm from '@/components/forms/steps/ReferenceForm';
import BankDetailsForm from '@/components/forms/steps/BankDetailsForm';
import BankStatementForm from '@/components/forms/steps/BankStatementForm';
import LoanRequestForm from '@/components/forms/steps/LoanRequestForm';
import AssistedCompletionForm from '@/components/forms/steps/AssistedCompletionForm';

const STEPS = [
  {
    id: 'eligibility',
    title: 'Eligibility',
    icon: User,
    component: EligibilityForm,
  },
  {
    id: 'selfie',
    title: 'Selfie',
    icon: Camera,
    component: SelfieForm,
  },
  {
    id: 'ekyc',
    title: 'eKYC',
    icon: Fingerprint,
    component: EkycVerificationForm,
  },
  {
    id: 'reference',
    title: 'Reference',
    icon: Users,
    component: ReferenceForm,
  },
  {
    id: 'disbursal_bank',
    title: 'Bank Details',
    icon: Banknote,
    component: BankDetailsForm,
  },
  {
    id: 'bank_statement',
    title: 'Statement',
    icon: FileUp,
    component: BankStatementForm,
  },
  {
    id: 'loan_request',
    title: 'Loan Request',
    icon: IndianRupee,
    component: LoanRequestForm,
  },
  {
    id: 'completion',
    title: 'Submission',
    icon: CheckCircle2,
    component: AssistedCompletionForm,
  },
];

export default function AdminAssistedApplication() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const isDsaPartner = isDsaPartnerRole(admin);
  const exitPath = isDsaPartner ? dsaPartnerHomePath() : '/admin/applications';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [navError, setNavError] = useState('');
  const [targetUserId, setTargetUserId] = useState(null);
  const [applicationData, setApplicationData] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const rawToken = String(token || '').trim();
      if (!rawToken || rawToken === 'null' || rawToken === 'undefined') {
        setError('Invalid assisted fill link. Open Fill again from the incomplete applications list.');
        setLoading(false);
        return;
      }

      // 1. Fetch application details via secure token
      const response = await adminAPI.getApplicationByToken(rawToken);
      if (response.status === 1) {
        const fullData = response.data;
        const app = fullData.application;
        const userId = app.user_id;
        const appId = app.id;
        setTargetUserId(userId);
        setApplicationData(fullData);

        if (
          isDsaPartner &&
          app.application_status &&
          app.application_status !== 'draft'
        ) {
          navigate(`/admin/dsa/applications/${appId}/status`, { replace: true });
          return;
        }

        const progressData = fullData.progress;
        if (progressData) {
          setProgress(progressData);

          const currentStepName = progressData.currentStep;
          let stepIndex = STEPS.findIndex((s) => s.id === currentStepName);

          if (stepIndex === -1 && currentStepName === 'esign') {
            stepIndex = STEPS.findIndex((s) => s.id === 'loan_request');
          }
          if (stepIndex === -1 && currentStepName === 'residence_proof') {
            stepIndex = STEPS.findIndex((s) => s.id === 'reference');
          }

          if (stepIndex !== -1) {
            setCurrentStepIndex(stepIndex);
          }
        }
      } else {
        setError(response.message || 'Failed to fetch application details');
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('An error occurred while fetching application data');
    } finally {
      setLoading(false);
    }
  }, [token, isDsaPartner, navigate]);

  const handleStepSuccess = useCallback(async (stepResult) => {
    setSuccess('Step completed successfully!');
    setTimeout(() => setSuccess(''), 3000);

    if (stepResult?.targetUserId && stepResult.targetUserId !== targetUserId) {
      setTargetUserId(stepResult.targetUserId);
      setApplicationData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          application: {
            ...prev.application,
            user_id: stepResult.targetUserId,
            customer_code: stepResult.customerCode || prev.application?.customer_code,
          },
        };
      });
    }

    try {
      if (!applicationData?.application?.id) return;
      const appId = applicationData.application.id;
      const progressRes = await adminAPI.getApplicationProgress(appId);
      if (progressRes.status === 1) {
        setProgress(progressRes.data);
        const nextStepName = progressRes.data.currentStep;
        let nextIndex = STEPS.findIndex((s) => s.id === nextStepName);

        if (nextIndex === -1 && nextStepName === 'esign') {
          nextIndex = STEPS.findIndex((s) => s.id === 'loan_request');
        }
        if (nextIndex === -1 && nextStepName === 'residence_proof') {
          nextIndex = STEPS.findIndex((s) => s.id === 'reference');
        }

        if (nextIndex !== -1 && nextIndex > currentStepIndex) {
          setCurrentStepIndex(nextIndex);
        } else if (currentStepIndex < STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else if (currentStepIndex === STEPS.length - 1) {
          setSuccess('Application submitted! Redirecting…');
          const statusPath = isDsaPartner
            ? `/admin/dsa/applications/${appId}/status`
            : exitPath;
          setTimeout(() => navigate(statusPath), 1500);
        }
      }
    } catch (err) {
      console.error('Failed to refresh progress:', err);
      if (currentStepIndex < STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [applicationData, currentStepIndex, navigate, exitPath, isDsaPartner]);

  const maxAllowedIndex = useMemo(() => {
    if (!progress?.currentStep) return 0;
    const currentStepName = progress.currentStep;
    let maxIdx = STEPS.findIndex((s) => s.id === currentStepName);
    if (maxIdx === -1 && currentStepName === 'esign') maxIdx = STEPS.findIndex((s) => s.id === 'loan_request');
    if (maxIdx === -1 && currentStepName === 'residence_proof') maxIdx = STEPS.findIndex((s) => s.id === 'reference');
    if (maxIdx === -1) maxIdx = STEPS.length - 1;
    return maxIdx;
  }, [progress?.currentStep]);

  const goToStep = useCallback((index) => {
    setNavError('');
    if (index > maxAllowedIndex) {
      const blockedStep = STEPS[index];
      setNavError(`Complete the current step before jumping to "${blockedStep.title}".`);
      setTimeout(() => setNavError(''), 4000);
      return;
    }
    setCurrentStepIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [maxAllowedIndex]);

  if (loading)
    return <PageLoader text="Initializing Application Session..." minHeight="min-h-[60vh]" />;

  const currentStep = STEPS[currentStepIndex];
  const ActiveStepComponent = currentStep.component;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden selection:bg-blue-100">
        {/* Top Navbar */}
        <div className="sticky top-0 z-50 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-4 shadow-sm">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(exitPath)}
                    className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-sm text-slate-900 tracking-widest uppercase">Assisted Application</h1>
                    {applicationData?.application?.lead_id && (
                      <p className="text-[11px] font-mono text-slate-500">{applicationData.application.lead_id}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
                <div className="hidden md:flex flex-col items-end">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Customer</p>
                    <p className="text-sm text-slate-900">
                        {applicationData?.application?.full_name || applicationData?.application?.user_name || 'Customer'}
                    </p>
                </div>
                <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Progress</p>
                        <p className="text-sm text-blue-600">
                            {Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto py-5 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {/* Lateral Stepper Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-slate-200 p-4 sticky top-24 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest px-4 mb-4">Steps</p>
                        <div className="space-y-1">
                            {STEPS.map((step, idx) => {
                                const isActive = currentStepIndex === idx;
                                const isCompleted = idx < maxAllowedIndex;
                                const isLocked = idx > maxAllowedIndex;
                                const Icon = step.icon;

                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => !isLocked && goToStep(idx)}
                                        disabled={isLocked}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-lg transition-all group relative",
                                            isActive 
                                                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                                                : isLocked
                                                ? "opacity-30 cursor-not-allowed grayscale"
                                                : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                            isActive 
                                                ? "bg-blue-600 text-white" 
                                                : isCompleted
                                                ? "bg-green-50 text-green-600 border border-green-100"
                                                : "bg-slate-100 text-slate-400"
                                        )}>
                                            {isCompleted && !isActive ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                        </div>
                                        <div className="text-left">
                                            <p className={cn("text-xs tracking-tight", isActive ? "text-blue-700" : "text-slate-600")}>
                                                {step.title}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-4">
                    {error && (
                        <Alert className="bg-red-50 border-red-200 rounded-lg p-4 text-red-700">
                            <div className="flex items-center gap-4">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <AlertDescription className="text-sm tracking-tight">{error}</AlertDescription>
                            </div>
                        </Alert>
                    )}

                    {applicationData?.application?.locked_admin_name && (
                        <Alert className="bg-amber-50 border-amber-200 rounded-lg p-4 text-amber-800">
                            <div className="flex items-center gap-4">
                                <Lock className="w-5 h-5"/>
                                <AlertDescription className="text-sm tracking-tight">
                                    In progress — locked by {applicationData.application.locked_admin_name}
                                    {applicationData.application.customer_code ? ` · ${applicationData.application.customer_code}` : ''}
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}

                    {navError && (
                        <Alert className="bg-amber-50 border-amber-200 rounded-lg p-4 text-amber-700">
                            <div className="flex items-center gap-4">
                                <Lock className="w-5 h-5"/>
                                <AlertDescription className="text-sm tracking-tight">{navError}</AlertDescription>
                            </div>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-emerald-50 border-emerald-200 rounded-lg p-4 text-emerald-700">
                            <div className="flex items-center gap-4">
                                <CheckCircle2 className="w-5 h-5"/>
                                <AlertDescription className="text-sm tracking-tight">{success}</AlertDescription>
                            </div>
                        </Alert>
                    )}

                    {/* Form Container */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        {/* Simplified Header */}
                        <div className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-slate-50">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl text-slate-900 tracking-tight">
                                    {currentStep.title}
                                </h2>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] uppercase tracking-widest border border-slate-200">
                                   {applicationData?.application?.customer_code || applicationData?.profile?.customer_code || `ID: ${applicationData?.application?.id || '---'}`}
                                </span>
                            </div>
                        </div>

                        {/* Step Form Wrapper */}
                        <div className="p-5">
                            <div className="min-h-[400px]">
                                <ActiveStepComponent
                                    onSuccess={handleStepSuccess}
                                    onClose={() => navigate(exitPath)}
                                    applicationId={applicationData?.application?.id}
                                    targetUserId={targetUserId}
                                    isAdminMode={true}
                                    reapplicationData={applicationData?.reapplicationData}
                                    applicationData={{
                                      ...applicationData,
                                      ...(progress || {}),
                                      profile: applicationData?.profile || progress?.profile,
                                      kyc: applicationData?.kyc_details || applicationData?.kyc || progress?.kyc,
                                      bankDetails: applicationData?.bankDetails || progress?.bankDetails,
                                      references: applicationData?.references || progress?.references,
                                      selfie: (() => {
                                        const s = applicationData?.selfie || progress?.selfie;
                                        if (!s) return null;
                                        return s;
                                      })(),
                                      bankStatement: applicationData?.bankStatement || progress?.bankStatement,
                                      salarySlips: applicationData?.salarySlips || progress?.salarySlips,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Action Bar Footer */}
                        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex items-center">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                                disabled={currentStepIndex === 0}
                                className="h-10 px-4 border-slate-200 hover:bg-white text-slate-600 rounded-lg text-xs transition-all disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Previous
                            </Button>
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                            Created on {format(new Date(applicationData?.application?.created_at), 'MMM dd, yyyy • HH:mm')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

