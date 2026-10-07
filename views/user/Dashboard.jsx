import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useNavigate, useSearchParams } from '@/lib/router';
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatApplicationAppliedLabel } from '@/lib/utils/applicationDates';
import {
  daysFromToday,
  getNextSalaryRepaymentDate,
  getRepaymentDateOptions,
  resolveMaxTenureDays,
  toLocalISODate,
} from '@/lib/utils/salaryRepaymentDates';
import { getCustomerStatusMessage, getCustomerStatusCardTone } from '@/lib/utils/customerStatusMessages';
import { StatusBadge } from '@/utils/statusUtils';
import { customerUi } from '@/config/customerUiTokens';
import { cn } from '@/lib/utils';
import { uploadToCloudinary, UPLOAD_FOLDERS } from '@/lib/services/cloudinaryUpload';
import { Spinner } from "@/components/ui/spinner";
import MainLayout from "@/components/layouts/MainLayout";
import {
  CheckCircle2,
  ArrowRight,
  FileText,
  Clock,
  XCircle,
  RefreshCw,
  PenTool,
  Target,
  Video,
  AlertTriangle,
  Upload,
  Mic,
  User,
  Calendar,
  ExternalLink,
  Camera,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import ESignForm from "@/components/forms/steps/ESignForm";
import VideoDeclaration from "@/components/offer/VideoDeclaration";
import VideoDeclarationRejectedCard from "@/components/offer/VideoDeclarationRejectedCard";

// Offer Components
import OfferCard from "@/components/offer/OfferCard";
import { loanAPI } from "@/lib/api/loan";

import {
  applicationSteps,
  getErrorMessage,
  isOfferApplication,
} from "./dashboard/applicationSteps";
import DisbursementSummary from "./dashboard/DisbursementSummary";
import { useDashboardReturnUrls } from "./dashboard/useDashboardReturnUrls";
import { useDashboardData } from "./dashboard/useDashboardData";
import LoanDetailsDialog from "./dashboard/LoanDetailsDialog";
import SanctionLetterDialog from "./dashboard/SanctionLetterDialog";
import {
  CreditBlockedPanel,
  RejectedApplicationPanel,
  ApplicationJourney,
} from "./dashboard/DashboardStatusPanels";
import { DashboardErrorBoundary } from "./dashboard/DashboardErrorBoundary";

export default function Dashboard() {
  const { user } = useAuth();
  const { applicationUpdate } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasAutoResumed = useRef(false);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [showSanctionLetterDialog, setShowSanctionLetterDialog] = useState(false);

  const {
    progress,
    setProgress,
    loading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    showWelcome,
    setShowWelcome,
    creatingApplication,
    setCreatingApplication,
    submittingFinal,
    setSubmittingFinal,
    currentApplicationId,
    setCurrentApplicationId,
    submittedApplication,
    setSubmittedApplication,
    rejectedApplication,
    pendingOffer,
    setPendingOffer,
    initialLoadDone,
    repaymentSummary,
    refreshing,
    userProfile,
    kycData,
    bankDetails,
    references,
    selfie,
    bankStatement,
    setBankStatement,
    salarySlips,
    setSalarySlips,
    residenceProofs,
    reapplicationData,
    creditEligibility,
    setVideoDeclarationStatus,
    isCreditBlocked,
    showOnboardingJourney,
    hasDraftApplication,
    fetchData,
    fetchDataRef,
    getStepStatus,
  } = useDashboardData({
    userId: user?.id,
    applicationUpdate,
    hasAutoResumed,
    setActiveStep,
  });

  const [videoFile, setVideoFile] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const videoUploadPromiseRef = useRef(null);
  const videoResultRef = useRef(null);

  const [reloanLink, setReloanLink] = useState('');
  const [showLoanDetailsDialog, setShowLoanDetailsDialog] = useState(false);
  const [loanDetails, setLoanDetails] = useState({
     purpose: "personal",
     principalAmount: "",
     tenureDays: "14",
     selectedRepaymentDate: ""
  });
  const [repaymentDateOptions, setRepaymentDateOptions] = useState([]);

  useDashboardReturnUrls({
    setSuccessMessage,
    fetchData: (...args) => fetchDataRef.current?.(...args),
    setActiveStep,
    hasAutoResumed,
    setSearchParams,
    searchParams,
    applicationSteps,
    getApplicationId: () => currentApplicationId || submittedApplication?.id || null,
  });

  // ✅ AUTO-RESUME: Open the next incomplete step when user returns to dashboard
  const reloanPhase = ['pending', 'submitting', 'failed'].includes(submittedApplication?.reloan_auto_submit)
    && (submittedApplication?.application_status === 'draft' || submittedApplication?.status === 'draft');
  const canReloan = Number(reapplicationData?.closedLoansCount || 0) > 0;

  useEffect(() => {
    const phase = submittedApplication?.reloan_auto_submit;
    if (phase !== 'pending' && phase !== 'submitting') return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const res = await loanAPI.getReloanStatus();
        if (stop || res?.status !== 1) return;
        if (res.data?.hostedUrl) setReloanLink(res.data.hostedUrl);
        if (res.data?.reloanAutoSubmit === 'submitted' || res.data?.reloanAutoSubmit === 'failed') {
          fetchDataRef.current?.(true);
        }
      } catch (_) {}
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [submittedApplication?.reloan_auto_submit]);

  useEffect(() => {
    if (!initialLoadDone || showWelcome || loading || hasAutoResumed.current || reloanPhase) return;
    // Cool-off blocks new apps only — draft customers can still auto-resume steps
    if (isCreditBlocked && !hasDraftApplication) return;
    // Don't auto-resume if application is already submitted (not draft)
    if (submittedApplication && submittedApplication.application_status !== 'draft') return;
    // Don't auto-resume if no progress data or no steps completed
    if (!progress || !progress.currentStep || progress.completedSteps === 0) return;
    // Don't auto-resume if all onboarding steps are done (show submit button instead)
    if (progress.completedSteps >= 7) return;

    // Never skip Check Eligibility — only advance when that step is truly completed
    const eligibilityStatus = progress.steps?.find((s) => s.name === 'eligibility')?.status;
    const nextStepId =
      eligibilityStatus === 'completed' ? progress.currentStep : 'eligibility';

    const nextStep = applicationSteps.find(s => s.id === nextStepId);
    if (nextStep) {
      console.log('[Dashboard] Auto-resuming to step:', nextStep.id);
      setActiveStep(nextStep);
      hasAutoResumed.current = true;
    }
  }, [initialLoadDone, showWelcome, loading, progress, submittedApplication, isCreditBlocked, hasDraftApplication]);

  useEffect(() => {
    // Cool-off must not kick a draft customer out of an open onboarding step
    if (isCreditBlocked && !hasDraftApplication) {
      setActiveStep(null);
      hasAutoResumed.current = true;
    }
  }, [isCreditBlocked, hasDraftApplication]);

  const moveToNextStep = async (stepData, completedStepId) => {
    const stepId = completedStepId || activeStep?.id;

    setShowWelcome(false);

    // Editing a section from Review → refresh and return to Review
    if (editingFromReview) {
      setEditingFromReview(false);
      setSuccessMessage("Details updated.");
      setActiveStep(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await fetchData(true);
      const reviewStep = applicationSteps.find((s) => s.id === "review");
      if (reviewStep) setActiveStep(reviewStep);
      setTimeout(() => setSuccessMessage(""), 3000);
      return;
    }
    
    // 1. OPTIMISTIC UPDATE: Make it feel "instant"
    if (stepId) {
      setProgress(prev => {
        if (!prev || !prev.steps) return prev;
        const alreadyCompleted = prev.steps.find(s => s.name === stepId)?.status === 'completed';
        if (alreadyCompleted) return prev;

        return {
          ...prev,
          completedSteps: Math.min(7, (prev.completedSteps || 0) + 1),
          progressPercent: Math.min(100, Math.round(((prev.completedSteps || 0) + 1) / 7 * 100)),
          steps: prev.steps.map(s => s.name === stepId ? { ...s, status: 'completed' } : s)
        };
      });
    }

    setSuccessMessage("Step completed successfully!");
    setActiveStep(null); 
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Apply docs from step response immediately (bank statement save used to skip refetch)
    if (stepData?.bankStatement) {
      setBankStatement(stepData.bankStatement);
    }
    if (Array.isArray(stepData?.salarySlips)) {
      setSalarySlips(stepData.salarySlips);
    }

    // 2. Use progress from step API when available — still refresh after docs so Review is accurate.
    // Eligibility saves PAN on the profile but does not return it in progress; refresh before
    // opening eKYC so the PAN field is not blank until a full page reload.
    if (stepData?.progress) {
      setProgress(stepData.progress);
      if (stepId === 'bank_statement' || stepId === 'eligibility') {
        await fetchData(true);
      }
      const nextStepId = stepData.progress.currentStep;
      if (nextStepId && stepData.progress.completedSteps < 7) {
        let resolvedNext = nextStepId;
        if (stepId && nextStepId === stepId) {
          const currentIndex = applicationSteps.findIndex(s => s.id === stepId);
          if (currentIndex !== -1 && currentIndex < applicationSteps.length - 1) {
            resolvedNext = applicationSteps[currentIndex + 1].id;
          }
        }
        const nextStep = applicationSteps.find(s => s.id === resolvedNext);
        if (nextStep) setActiveStep(nextStep);
      }
    } else {
      await fetchData(true, true, stepId);
    }

    // 3. CLEANUP
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleStepClick = (step, forceOpen = false) => {
    if (!step) return;
    if (isCreditBlocked) {
      setError(creditEligibility?.userMessage || 'You are not eligible to apply at this time.');
      return;
    }
    const status = getStepStatus(step.id);
    if (status === "completed" && !forceOpen) return;

    // Block jumping ahead before Check Eligibility is done
    if (step.id !== 'eligibility' && getStepStatus('eligibility') !== 'completed') {
      const eligibilityStep = applicationSteps.find((s) => s.id === 'eligibility');
      if (eligibilityStep) {
        setActiveStep(eligibilityStep);
        setError("");
        setSuccessMessage("");
        return;
      }
    }

    setActiveStep(step);
    setError("");
    setSuccessMessage("");
  };

  const handleEditFromReview = (stepId) => {
    const step = applicationSteps.find((s) => s.id === stepId);
    if (!step) return;
    setEditingFromReview(true);
    handleStepClick(step, true);
  };

  const handleCloseForm = async () => {
    if (editingFromReview) {
      setEditingFromReview(false);
      setError("");
      setActiveStep(null);
      await fetchData(true);
      const reviewStep = applicationSteps.find((s) => s.id === "review");
      if (reviewStep) setActiveStep(reviewStep);
      return;
    }
    setActiveStep(null);
    setError("");
  };

  const handleReviewRefresh = async () => {
    await fetchData(true);
  };

  const handleReloan = async () => {
    if (creditEligibility?.allowed === false) {
      setError(creditEligibility.userMessage || 'You are not eligible for a reloan at this time.');
      return;
    }
    setCreatingApplication(true);
    setError('');
    try {
      const response = await loanAPI.startReloan();
      if (response.status === 1 || response.status === 201) {
        setReloanLink(response.data?.hostedUrl || '');
        setCurrentApplicationId(response.data?.applicationId || null);
        await fetchData();
        setShowWelcome(false);
        setActiveStep(null);
      }
    } catch (err) {
      console.error('Failed to start reloan:', err);
      setError(getErrorMessage(err));
    } finally {
      setCreatingApplication(false);
    }
  };

  const handleStartApplication = async () => {
    if (creditEligibility?.allowed === false) {
      setError(creditEligibility.userMessage || 'You are not eligible to apply at this time.');
      return;
    }

    setCreatingApplication(true);
    setError("");
    try {
      const response = await loanAPI.initializeApplication({});
      if (response.status === 1 || response.status === 201) {
         setCurrentApplicationId(response.data.applicationId);
         await fetchData();
         setShowWelcome(false);
         setActiveStep(applicationSteps[0]);
      }
    } catch (err) {
      console.error("Failed to initialize application:", err);
      setError(getErrorMessage(err));
    } finally {
      setCreatingApplication(false);
    }
  };

  const getAutoNextSalaryDate = () => {
    const salaryDate = userProfile?.nextSalaryDate || userProfile?.next_salary_date;
    return getNextSalaryRepaymentDate(salaryDate, {
      maxTenureDays: resolveMaxTenureDays(userProfile?.max_tenure_days),
    });
  };

  const handleSubmitApplication = () => {
      const appId = currentApplicationId || (submittedApplication && submittedApplication.id);
      if (!appId) {
          setError("No application found. Please start a new application.");
          return;
      }
      if (!currentApplicationId && appId) setCurrentApplicationId(appId);

      let nextSalary = getAutoNextSalaryDate();
      if (!nextSalary) {
          const fallback = new Date();
          fallback.setDate(fallback.getDate() + 14);
          fallback.setHours(0, 0, 0, 0);
          nextSalary = fallback;
      }

      if (nextSalary) {
          const options = getRepaymentDateOptions(nextSalary, {
              maxTenureDays: resolveMaxTenureDays(userProfile?.max_tenure_days),
          });
          setRepaymentDateOptions(options);

          const defaultDate = options[0];
          const diffDays = daysFromToday(defaultDate);

          setLoanDetails(prev => ({
              ...prev,
              tenureDays: diffDays > 0 ? diffDays.toString() : "14",
              selectedRepaymentDate: toLocalISODate(defaultDate)
          }));
      }
      setShowLoanDetailsDialog(true);
      setError("");
  };

  const handleRepaymentDateSelect = (dateObj) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = dateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setLoanDetails(prev => ({
          ...prev,
          tenureDays: diffDays > 0 ? diffDays.toString() : "14",
          selectedRepaymentDate: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
      }));
  };

  const handleFinalSubmit = async () => {
      if (!loanDetails.purpose || !loanDetails.principalAmount || !loanDetails.tenureDays) {
          setError("Please fill all loan details");
          return;
      }
      const amount = parseFloat(loanDetails.principalAmount);
      if (amount < 1000 || amount > 50000) {
          setError("Loan amount must be between ₹1,000 and ₹50,000");
          return;
      }

      setSubmittingFinal(true);
      setError("");
      try {
          const response = await loanAPI.createLoanApplication({
              applicationId: currentApplicationId,
              purpose: loanDetails.purpose,
              principalAmount: parseFloat(loanDetails.principalAmount),
              tenureDays: parseInt(loanDetails.tenureDays),
              selectedRepaymentDate: loanDetails.selectedRepaymentDate
          });
          if (response.status === 1) {
              setSuccessMessage("Application submitted successfully!");
              setShowLoanDetailsDialog(false);
              setLoanDetails({ purpose: "personal", principalAmount: "", tenureDays: "14", selectedRepaymentDate: "" });
              setActiveStep(null); // Clear active step to close ReviewForm
              await fetchData();
              window.scrollTo(0,0);
          }
      } catch (err) {
          console.error("Failed to submit application:", err);
          setError(getErrorMessage(err));
      } finally {
          setSubmittingFinal(false);
      }
  };

  const startVideoUpload = (file) => {
    if (!file) return null;
    setVideoFile(file);
    setVideoProgress(0);
    videoResultRef.current = null;
    const task = uploadToCloudinary(file, {
      folder: UPLOAD_FOLDERS.videoDeclaration,
      resourceType: 'video',
      compress: false,
      onProgress: (percent) => setVideoProgress(percent),
    }).then((result) => {
      videoResultRef.current = result;
      setVideoProgress(100);
      return result;
    });
    videoUploadPromiseRef.current = task;
    return task;
  };

  const handleUploadVideoDeclaration = async (directFile = null) => {
    const fileToUpload = directFile || videoFile;
    if (!fileToUpload || !submittedApplication?.id) return;
    
    setUploadingVideo(true);
    setError("");
    try {
      let uploadResult = videoResultRef.current;
      if (directFile) {
        uploadResult = await startVideoUpload(directFile);
      } else if (!uploadResult && videoUploadPromiseRef.current) {
        uploadResult = await videoUploadPromiseRef.current;
      } else if (!uploadResult) {
        uploadResult = await startVideoUpload(fileToUpload);
      }

      const response = await loanAPI.saveVideoDeclaration(submittedApplication.id, uploadResult.url);
      if (response.status === 1) {
        setSuccessMessage("Video declaration submittted successfully! Our team will review it shortly.");
        setVideoFile(null);
        setVideoProgress(0);
        videoResultRef.current = null;
        videoUploadPromiseRef.current = null;
        setVideoDeclarationStatus('submitted');
        await fetchData(true);
      }
    } catch (err) {
      console.error("Video upload failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setUploadingVideo(false);
    }
  };

  const ActiveStepComponent = activeStep ? activeStep.component : null;

  const stepApplicationData = useMemo(
    () => ({
      ...progress,
      profile: userProfile,
      kyc: kycData || submittedApplication?.kyc,
      bankDetails: bankDetails || submittedApplication?.bankDetails,
      references: references || submittedApplication?.references,
      selfie: selfie || submittedApplication?.selfie || null,
      bankStatement: bankStatement || submittedApplication?.bankStatement,
      salarySlips: salarySlips || submittedApplication?.salarySlips,
      residenceProofs: residenceProofs || submittedApplication?.residenceProofs,
      reapplicationData,
    }),
    [
      progress,
      userProfile,
      kycData,
      bankDetails,
      references,
      selfie,
      bankStatement,
      salarySlips,
      residenceProofs,
      reapplicationData,
      submittedApplication,
    ]
  );

  const showOfferAcceptance = useMemo(
    () =>
      Boolean(
        submittedApplication &&
          isOfferApplication(submittedApplication) &&
          pendingOffer
      ),
    [submittedApplication, pendingOffer]
  );

  const applicationStatusMessage = useMemo(() => {
    if (!submittedApplication) return null;
    const status = submittedApplication.application_status;
    const msg = getCustomerStatusMessage(status);
    let { title, body } = msg;
    if (status === 'offer_accepted' && !submittedApplication.video_declaration_url) {
      title = 'Offer accepted — please complete your video declaration above.';
    }
    return { ...msg, title, body, status };
  }, [submittedApplication]);

  const mandateAuthUrl =
    submittedApplication?.mandate_auth_url ||
    submittedApplication?.authorization_url ||
    null;

  // Cool-off / bureau block only for starting a NEW loan — never over a live submitted app.
  const showCreditEligibilityBanner = false;
  const appStatus = String(
    submittedApplication?.application_status || submittedApplication?.status || ''
  ).toLowerCase();
  const hasLiveApplication =
    Boolean(submittedApplication) &&
    Boolean(appStatus) &&
    appStatus !== 'draft' &&
    !['rejected', 'closed', 'cancelled', 'withdrawn'].includes(appStatus);
  const showNewLoanBlockedBanner =
    isCreditBlocked && !hasDraftApplication && !hasLiveApplication;

  // AA return can set activeStep before we know journey is allowed — clear orphans so UI is not blank.
  useEffect(() => {
    if (!showOnboardingJourney && activeStep) {
      setActiveStep(null);
    }
  }, [showOnboardingJourney, activeStep]);

  return (
    <MainLayout>
      <DashboardErrorBoundary
        onReset={() => {
          hasAutoResumed.current = false;
          setActiveStep(null);
          fetchData(true);
        }}
      >
      <div className="space-y-8 animate-in fade-in duration-700">
        
         <LoanDetailsDialog
           open={showLoanDetailsDialog}
           onOpenChange={setShowLoanDetailsDialog}
           error={error}
           loanDetails={loanDetails}
           setLoanDetails={setLoanDetails}
           repaymentDateOptions={repaymentDateOptions}
           onRepaymentDateSelect={handleRepaymentDateSelect}
           submittingFinal={submittingFinal}
           onFinalSubmit={handleFinalSubmit}
         />

         <SanctionLetterDialog
           open={showSanctionLetterDialog}
           onOpenChange={setShowSanctionLetterDialog}
           application={submittedApplication}
           userProfile={progress?.profile}
         />

         <Dialog open={showVideoRecorder} onOpenChange={(open) => !uploadingVideo && setShowVideoRecorder(open)}>
            <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-5 pb-0">
                    <DialogTitle className="text-lg">Record your video again</DialogTitle>
                    <DialogDescription className="text-sm">
                        Read the declaration aloud while looking at the camera (up to ~90 seconds).
                    </DialogDescription>
                </DialogHeader>
                <div className="px-5 py-4">
                    <VideoDeclaration
                        onVideoReady={(file) => {
                            setShowVideoRecorder(false);
                            handleUploadVideoDeclaration(file);
                        }}
                        customerName={
                          userProfile?.full_name ||
                          userProfile?.fullName ||
                          progress?.profile?.full_name ||
                          progress?.profile?.fullName
                        }
                        sanctionDate={
                          submittedApplication?.offer_sent_at ||
                          submittedApplication?.offerSentAt ||
                          submittedApplication?.approved_at ||
                          submittedApplication?.approvedAt
                        }
                        loanAmount={
                          submittedApplication?.approved_amount ||
                          submittedApplication?.approvedAmount ||
                          submittedApplication?.principal_amount ||
                          submittedApplication?.principalAmount
                        }
                        repayAmount={
                          submittedApplication?.total_repayment_amount ||
                          submittedApplication?.totalRepayment
                        }
                        repayDate={
                          submittedApplication?.due_date ||
                          submittedApplication?.dueDate ||
                          submittedApplication?.repayment_date ||
                          submittedApplication?.repaymentDate
                        }
                    />
                </div>
            </DialogContent>
         </Dialog>

        {loading && !showWelcome && (
          <Spinner.Full className="text-slate-400" />
        )}

        {showWelcome && !loading && (
          <div className="max-w-4xl pt-20 px-4 sm:px-6 lg:px-8">
              {showNewLoanBlockedBanner && (
                <CreditBlockedPanel creditEligibility={creditEligibility} />
              )}
              {showCreditEligibilityBanner && !isCreditBlocked && (
                <CreditBlockedPanel creditEligibility={creditEligibility} />
              )}
              <div className="space-y-6">
                  <div className="space-y-2">
                      <h1 className="text-5xl font-semibold tracking-tight text-gray-900">
                        {reapplicationData?.isReturningUser ? 'Welcome Back!' : 'Loan Application'}
                      </h1>
                      <p className="text-xl text-gray-500 font-light">
                        {reapplicationData?.isReturningUser 
                          ? 'Ready to start your new loan application?' 
                          : 'Simple. Fast. Transparent.'}
                      </p>
                  </div>

                  {reapplicationData?.isReturningUser && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg border border-zinc-100 bg-zinc-50/50">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">Previous loans</p>
                        <p className="text-sm font-semibold text-zinc-900">{reapplicationData.previousLoansCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">Closed loans</p>
                        <p className="text-sm font-semibold text-zinc-900">{reapplicationData.closedLoansCount || 0}</p>
                      </div>
                      {reapplicationData.lastClosedLoan?.amount != null && (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Last loan</p>
                          <p className="text-sm font-semibold text-zinc-900">₹{Number(reapplicationData.lastClosedLoan.amount).toLocaleString('en-IN')}</p>
                        </div>
                      )}
                      {reapplicationData.previousProfile?.maxLoanAmount != null && (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Eligible up to</p>
                          <p className="text-sm font-semibold text-zinc-900">₹{Number(reapplicationData.previousProfile.maxLoanAmount).toLocaleString('en-IN')}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-8 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Paperless Process
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          Instant Approval
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                          Direct Disbursal
                      </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                        onClick={canReloan ? handleReloan : handleStartApplication} 
                        disabled={creatingApplication || creditEligibility?.allowed === false}
                        className="h-14 px-8 bg-[#222222] hover:bg-[#111111] text-white text-lg font-medium rounded-full shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {creatingApplication ? (
                            <>
                              <Spinner className="w-5 h-5 mr-2 text-white" /> Starting...
                            </>
                        ) : (
                            <>
                              {canReloan ? 'Reloan' : (reapplicationData?.isReturningUser ? 'Start New Application' : 'Get Started')} <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                  </div>
              </div>
          </div>
        )}

        {!showWelcome && !loading && reloanPhase && (
          <div className="max-w-xl mx-auto px-4 pt-16 space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Reloan</h1>
            {submittedApplication?.reloan_auto_submit === 'failed' ? (
              <>
                <p className="text-red-700">{submittedApplication.reloan_error || 'The reloan could not be submitted.'}</p>
                <Button
                  onClick={handleReloan}
                  disabled={creatingApplication}
                  className="h-12 px-6 bg-[#222222] text-white rounded-full"
                >
                  {creatingApplication ? 'Starting...' : 'Try Reloan again'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-600">
                  Complete the fresh Account Aggregator consent. The reloan is submitted automatically after the bank response. There is no second submit step.
                </p>
                {reloanLink ? (
                  <a
                    href={reloanLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center h-12 px-6 bg-[#222222] text-white rounded-full font-medium"
                  >
                    Continue Account Aggregator <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                ) : (
                  <p className="text-sm text-gray-400">Preparing your Account Aggregator link…</p>
                )}
              </>
            )}
          </div>
        )}

        {!showWelcome && !loading && !reloanPhase && (
          <>
             {showNewLoanBlockedBanner && (
               <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                 <CreditBlockedPanel creditEligibility={creditEligibility} />
               </div>
             )}
             {showCreditEligibilityBanner && !isCreditBlocked && (
               <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                 <CreditBlockedPanel creditEligibility={creditEligibility} />
               </div>
             )}
             {error && (
               <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                 <div className="flex">
                   <div className="flex-shrink-0">
                     <XCircle className="h-5 w-5 text-red-500" />
                   </div>
                   <div className="ml-3">
                     <p className="text-sm text-red-700">{error}</p>
                   </div>
                 </div>
               </div>
             )}
   
             {successMessage && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                  </div>
                </div>
             )}

            {/* Offer Section - unified card for offer_sent / pending_offer / approved */}
            {showOfferAcceptance && (
              <div className="max-w-4xl mx-auto mb-8">
                <OfferCard
                  offer={pendingOffer}
                  applicationMeta={{
                    leadId: submittedApplication.lead_id || null,
                    loanAccountNumber:
                      pendingOffer?.loanAccountNumber ||
                      submittedApplication.loan_account_number ||
                      null,
                    purpose: submittedApplication.purpose,
                    appliedAt: formatApplicationAppliedLabel(submittedApplication).value,
                  }}
                  onAccepted={async (data) => {
                    setPendingOffer(null);
                    setSubmittedApplication((prev) =>
                      prev
                        ? {
                            ...prev,
                            application_status: data?.application_status || 'video_declaration_submitted',
                            customer_status: data?.application_status || 'video_declaration_submitted',
                            video_declaration_url: data?.video_declaration_url || prev.video_declaration_url,
                          }
                        : prev
                    );
                    setSuccessMessage('Offer accepted! Your video is with our team for verification.');
                    await fetchData(true);
                  }}
                  onRejected={async () => {
                    setPendingOffer(null);
                    await fetchData(true);
                  }}
                  onRevisionRequested={async () => {
                    await fetchData(true);
                  }}
                />
              </div>
            )}
            
            {submittedApplication && ['offer_accepted', 'video_declaration_pending'].includes(submittedApplication.application_status) && !submittedApplication.video_declaration_url && (
               <div className="max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
                       <div className="bg-slate-900 p-6 text-white">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                               <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center">
                                       <Video className="w-6 h-6 text-white" />
                                   </div>
                                   <div>
                                       <h2 className="text-xl font-semibold tracking-tight">Video declaration</h2>
                                       <p className="text-slate-300 text-sm mt-0.5">Record a short video to confirm your loan consent</p>
                                   </div>
                               </div>
                           </div>
                       </div>

                       <div className="p-6 space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-3">
                                   <p className="text-xs font-medium text-slate-500">Instructions</p>
                                   <div className="space-y-2">
                                       {[
                                           { icon: User, text: "Clearly state your full name and loan consent" },
                                           { icon: Camera, text: "Ensure your face is clearly visible and well-lit" },
                                           { icon: Mic, text: "Speak loudly and clearly in a quiet environment" },
                                           { icon: Clock, text: "Video should be about 15–90 seconds" }
                                       ].map((item, i) => (
                                           <div key={i} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                                               <div className="w-8 h-8 bg-white rounded-lg border border-zinc-100 flex items-center justify-center shrink-0">
                                                   <item.icon className="w-4 h-4 text-zinc-700" />
                                               </div>
                                               <p className="text-sm font-medium text-zinc-700 leading-snug">{item.text}</p>
                                           </div>
                                       ))}
                                   </div>
                               </div>

                               <div className="space-y-3">
                                   <p className="text-xs font-medium text-slate-500">Upload video</p>
                                   <div className="space-y-3">
                                       <label className="relative block h-[200px] border-2 border-dashed border-zinc-200 rounded-lg bg-zinc-50/50 hover:bg-white hover:border-zinc-400 transition-all cursor-pointer overflow-hidden">
                                           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                               <div className="w-12 h-12 bg-white rounded-lg border border-zinc-100 flex items-center justify-center mb-3">
                                                   <Upload className="w-5 h-5 text-zinc-700" />
                                               </div>
                                               <p className="text-sm font-semibold text-zinc-900">
                                                   {videoFile ? videoFile.name : 'Select declaration video'}
                                               </p>
                                               <p className="text-xs text-slate-500 mt-1">MP4 or WebM, up to 100MB</p>
                                           </div>
                                           <input 
                                               type="file"
                                               accept="video/mp4,video/webm,video/quicktime"
                                               className="hidden"
                                               onChange={(e) => {
                                                 const file = e.target.files[0];
                                                 if (!file) return;
                                                 startVideoUpload(file);
                                               }}
                                           />
                                       </label>

                                       {videoFile && (
                                           <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100 animate-in zoom-in-95">
                                               <div className="w-9 h-9 bg-white rounded-lg border border-emerald-100 flex items-center justify-center shrink-0">
                                                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                               </div>
                                               <div className="flex-1 min-w-0">
                                                   <p className="text-sm font-medium text-emerald-900 truncate">{videoFile.name}</p>
                                                   <p className="text-xs text-emerald-700">
                                                     {videoProgress > 0 && videoProgress < 100
                                                       ? `Uploading ${videoProgress}%`
                                                       : videoProgress >= 100
                                                         ? 'Uploaded — ready to submit'
                                                         : `Ready to upload · ${(videoFile.size / (1024*1024)).toFixed(1)} MB`}
                                                   </p>
                                                   {videoProgress > 0 && videoProgress < 100 && (
                                                     <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
                                                       <div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.max(videoProgress, 8)}%` }} />
                                                     </div>
                                                   )}
                                               </div>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           </div>

                           <div className="pt-4 border-t border-zinc-100">
                               <Button 
                                   onClick={handleUploadVideoDeclaration}
                                   disabled={!videoFile || uploadingVideo}
                                   className="w-full h-12 bg-zinc-950 hover:bg-black text-white rounded-lg transition-all active:scale-[0.98]"
                               >
                                   {uploadingVideo ? (
                                       <div className="flex items-center gap-3">
                                           <Spinner className="w-5 h-5 text-white" />
                                           <span className="text-sm font-semibold">
                                             {videoProgress > 0 && videoProgress < 100
                                               ? `Uploading ${videoProgress}%`
                                               : 'Processing video…'}
                                           </span>
                                       </div>
                                   ) : (
                                       <div className="flex items-center gap-2">
                                           <Video className="w-5 h-5" />
                                           <span className="text-sm font-semibold">Submit video declaration</span>
                                           <ArrowRight className="w-4 h-4 opacity-60" />
                                       </div>
                                   )}
                               </Button>
                           </div>
                       </div>
                   </div>
               </div>
            )}

             {submittedApplication && (submittedApplication.application_status === 'video_declaration_submitted' || (submittedApplication.application_status === 'offer_accepted' && submittedApplication.video_declaration_url)) && (
                <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-amber-100/50 shadow-xl shadow-amber-100/20 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-50/0 via-amber-50/50 to-amber-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        
                        <div className="relative">
                            <div className="w-16 h-16 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-sm">
                                <Video className="w-8 h-8 text-amber-500" />
                            </div>
                            
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Video Under Review</h2>
                            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                                Our team is verifying your declaration. We'll update you shortly.
                            </p>

                            <Button 
                                variant="outline" 
                                onClick={() => fetchData(true)}
                                disabled={refreshing}
                                className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-all duration-300 min-w-[140px]"
                            >
                                {refreshing ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner className="w-4 h-4 text-amber-600" />
                                        <span>Checking...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Check Status</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
             )}

            {submittedApplication && submittedApplication.application_status === 'video_declaration_rejected' && (
              <VideoDeclarationRejectedCard
                rejectionReason={
                  submittedApplication.video_rejection_comment || submittedApplication.admin_remarks
                }
                onRecordAgain={() => setShowVideoRecorder(true)}
                uploading={uploadingVideo}
              />
            )}

              {submittedApplication && submittedApplication.application_status === 'esign_pending' && (
                <div className="max-w-4xl mx-auto mb-8 slide-in-from-bottom-4 duration-500 animate-in fade-in">
                    <ESignForm 
                        applicationId={submittedApplication.id}
                        application={submittedApplication}
                        onSuccess={() => fetchData(true)}
                        onClose={() => {}} 
                    />
                </div>
              )}

              {submittedApplication && submittedApplication.application_status === 'esign_completed' && (
                <div className="max-w-4xl mx-auto mb-8 slide-in-from-bottom-4 duration-500 animate-in fade-in">
                    <div className="bg-white rounded-lg border border-emerald-100 shadow-xl overflow-hidden">
                       <div className="flex items-center gap-4 p-6 border-b border-gray-50 bg-emerald-50/20">
                           <div className="p-3 bg-emerald-600 text-white rounded-full shadow-sm shadow-emerald-200">
                               <CheckCircle2 className="w-6 h-6 text-white" />
                           </div>
                           <div>
                               <h2 className="text-lg font-semibold text-gray-900 leading-tight">Agreement signed</h2>
                               <p className="text-gray-500 text-sm font-medium">Your amount will be disbursed within 15 minutes.</p>
                           </div>
                       </div>
                       <div className="p-6 bg-white">
                           <DisbursementSummary application={submittedApplication} />
                       </div>
                    </div>
                </div>
              )}

              {submittedApplication && submittedApplication.application_status === 'mandate_pending' && (
                <div className="max-w-4xl mx-auto mb-8 slide-in-from-bottom-4 duration-500 animate-in fade-in">
                    <div className="bg-white rounded-lg border border-amber-100 shadow-xl overflow-hidden">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-gray-50 bg-amber-50/20">
                           <div className="flex items-center gap-4">
                               <div className="p-3 bg-amber-50 text-amber-700 rounded-full shadow-sm">
                                   <Banknote className="w-6 h-6" />
                               </div>
                               <div>
                                   <h2 className="text-lg font-semibold text-gray-900 leading-tight">Complete bank auto-debit</h2>
                                   <p className="text-gray-500 text-sm font-medium">
                                     Authorize EMI auto-debit (eNACH) with your bank. Disbursement starts after this step.
                                   </p>
                               </div>
                           </div>
                           {mandateAuthUrl ? (
                             <Button
                               asChild
                               className="bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                             >
                               <a href={mandateAuthUrl} target="_blank" rel="noopener noreferrer">
                                 <ExternalLink className="w-4 h-4 mr-2" />
                                 Complete auto-debit
                               </a>
                             </Button>
                           ) : (
                             <p className="text-xs text-amber-800 max-w-xs">
                               Link will appear here once registration starts. Check your email/SMS or refresh this page.
                             </p>
                           )}
                       </div>
                       <div className="p-6 bg-white">
                           <DisbursementSummary application={submittedApplication} />
                       </div>
                    </div>
                </div>
              )}

              {submittedApplication && submittedApplication.application_status === 'disbursed' && (
                <div className="max-w-4xl mx-auto mb-8 slide-in-from-bottom-4 duration-500 animate-in fade-in">
                    <div className="bg-white rounded-lg border border-green-100 shadow-xl overflow-hidden">
                       <div className="bg-green-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-green-50">
                           <div className="flex items-center gap-4">
                               <div className="p-3 bg-white text-green-600 rounded-full shadow-sm">
                                   <CheckCircle2 className="w-6 h-6" />
                               </div>
                               <div>
                                   <h2 className="text-lg font-semibold text-gray-900 leading-tight">Loan disbursed</h2>
                                   <p className="text-green-700/70 text-sm font-medium">Funds have been processed.</p>
                               </div>
                           </div>
                           <button 
                               onClick={() => navigate('/repayment')}
                               className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-all shadow-lg hover:shadow-green-200 active:scale-95 flex items-center justify-center gap-2"
                           >
                               <Calendar className="w-3.5 h-3.5" />
                               Pay / View Repayment
                           </button>
                       </div>
                       <div className="p-6 bg-white space-y-4">
                           <DisbursementSummary application={submittedApplication} />
                           {repaymentSummary && (
                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-green-50">
                               {repaymentSummary.isOverdue && (
                                 <div className="col-span-2 sm:col-span-4">
                                   <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                     Payment overdue — please pay at the earliest to avoid penalties.
                                   </p>
                                 </div>
                               )}
                               <div>
                                 <p className="text-[10px] text-gray-400 uppercase font-medium">Amount due</p>
                                 <p className={`text-sm font-semibold ${repaymentSummary.isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                                   ₹{(repaymentSummary.paid >= repaymentSummary.total
                                     ? 0
                                     : Number(repaymentSummary.pendingAmount || submittedApplication.total_repayment_amount || 0)
                                   ).toLocaleString('en-IN')}
                                 </p>
                               </div>
                               <div>
                                 <p className="text-[10px] text-gray-400 uppercase font-medium">Due date</p>
                                 <p className="text-sm font-semibold text-gray-900">
                                   {repaymentSummary.nextDueDate
                                     ? new Date(repaymentSummary.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                     : '—'}
                                 </p>
                               </div>
                               <div>
                                 <p className="text-[10px] text-gray-400 uppercase font-medium">Paid</p>
                                 <p className="text-sm font-semibold text-emerald-700">{repaymentSummary.paid}/{repaymentSummary.total} EMI</p>
                               </div>
                               <div>
                                 <p className="text-[10px] text-gray-400 uppercase font-medium">Total payable</p>
                                 <p className="text-sm font-semibold text-gray-900">
                                   ₹{parseFloat(submittedApplication.total_repayment_amount || 0).toLocaleString('en-IN')}
                                 </p>
                               </div>
                             </div>
                           )}
                       </div>
                    </div>
                </div>
              )}

            {submittedApplication &&
              !showOfferAcceptance &&
              submittedApplication.application_status !== 'draft' &&
              !['disbursed', 'closed', 'defaulted'].includes(submittedApplication.application_status) &&
              applicationStatusMessage && (
              <div className="max-w-4xl mx-auto mb-8">
                  <Card className={cn('border shadow-sm overflow-hidden', getCustomerStatusCardTone(applicationStatusMessage.status))}>
                     <CardHeader className="border-b border-slate-100 py-4 px-6 bg-white">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <CardTitle className="text-lg font-semibold text-slate-900">Application status</CardTitle>
                                    {(submittedApplication.lead_id || submittedApplication.loan_account_number) && (
                                      <CardDescription className="text-xs text-slate-500 font-mono">
                                        {submittedApplication.loan_account_number
                                          ? `LAN ${submittedApplication.loan_account_number}`
                                          : `Lead ${submittedApplication.lead_id}`}
                                      </CardDescription>
                                    )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                                  onClick={() => fetchData(true)}
                                  disabled={refreshing}
                                  aria-label="Refresh status"
                                >
                                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            <StatusBadge status={applicationStatusMessage.status} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className={customerUi.label}>Loan amount</p>
                                <p className={customerUi.value}>
                                    {(submittedApplication.approved_amount || submittedApplication.principal_amount) ?
                                     `₹${(submittedApplication.approved_amount || submittedApplication.principal_amount).toLocaleString('en-IN')}` :
                                     '—'
                                    }
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className={customerUi.label}>Purpose</p>
                                <p className="text-sm font-semibold text-slate-900 capitalize">
                                    {submittedApplication.purpose
                                      ? String(submittedApplication.purpose).replace(/_/g, ' ')
                                      : '—'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className={customerUi.label}>
                                  {formatApplicationAppliedLabel(submittedApplication).label}
                                </p>
                                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                    {formatApplicationAppliedLabel(submittedApplication).value || '—'}
                                </p>
                            </div>
                        </div>

                         <div className={cn('mt-6 p-4 border rounded-lg flex gap-3', applicationStatusMessage.styles.container)}>
                             <div className="flex-shrink-0">
                                 {applicationStatusMessage.tone === 'success' ? (
                                     <CheckCircle2 className={cn('w-5 h-5', applicationStatusMessage.styles.icon)} />
                                 ) : applicationStatusMessage.tone === 'warning' ? (
                                     <AlertTriangle className={cn('w-5 h-5', applicationStatusMessage.styles.icon)} />
                                 ) : (
                                     <Clock className={cn('w-5 h-5', applicationStatusMessage.styles.icon)} />
                                 )}
                            </div>
                            <div className="text-sm leading-relaxed">
                                <strong className={applicationStatusMessage.styles.title}>
                                  {applicationStatusMessage.title}
                                </strong>
                                <p className={cn('mt-1', applicationStatusMessage.styles.body)}>
                                  {applicationStatusMessage.body}
                                </p>
                                {applicationStatusMessage.showMandateCta && mandateAuthUrl && (
                                  <Button
                                    asChild
                                    size="sm"
                                    className="mt-3 bg-slate-900 hover:bg-slate-800 text-white"
                                  >
                                    <a href={mandateAuthUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-4 h-4 mr-2" /> Complete auto-debit
                                    </a>
                                  </Button>
                                )}
                                {applicationStatusMessage.showSanctionLetter &&
                                  !submittedApplication.video_declaration_url &&
                                  !['video_declaration_submitted'].includes(applicationStatusMessage.status) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 ml-0 sm:ml-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                    onClick={() => setShowSanctionLetterDialog(true)}
                                  >
                                    <FileText className="w-4 h-4 mr-2" /> View sanction letter
                                  </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                  </Card>
              </div>
            )}

            {submittedApplication && submittedApplication.application_status === 'disbursed' && (
               <div id="repayment-section" className="max-w-4xl mx-auto mb-8 scroll-mt-24">
                  <Card className="border-zinc-200 shadow-lg bg-zinc-950 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Banknote className="w-32 h-32" />
                    </div>
                    <CardHeader className="border-b border-slate-200 pb-4">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <Target className="w-5 h-5 text-green-400" />
                                    Active Loan Repayment
                                </CardTitle>
                                <CardDescription className="text-slate-500 mt-1">
                                    Manage your loan repayment.
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={() => navigate('/repayment')}
                                className="bg-white text-zinc-900 hover:bg-zinc-200 font-semibold border-0"
                            >
                                View Repayment <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardHeader>
                  </Card>
               </div>
            )}

            {rejectedApplication && (!submittedApplication || isCreditBlocked) && !activeStep && (
              <RejectedApplicationPanel
                creatingApplication={creatingApplication}
                creditEligibility={creditEligibility}
                onStartApplication={handleStartApplication}
              />
            )}

            {showOnboardingJourney && ActiveStepComponent && (
              <div className="mb-8">
                <Suspense
                  fallback={
                    <div className="flex justify-center py-12">
                      <Spinner className="w-8 h-8 text-primary" />
                    </div>
                  }
                >
                  <ActiveStepComponent
                    onSuccess={(data) => moveToNextStep(data, activeStep?.id)}
                    onConfirm={activeStep?.id === 'review' ? handleSubmitApplication : (data) => moveToNextStep(data, activeStep?.id)}
                    onEditStep={handleEditFromReview}
                    onClose={handleCloseForm}
                    onRefresh={handleReviewRefresh}
                    applicationId={currentApplicationId}
                    reapplicationData={reapplicationData}
                    applicationData={stepApplicationData}
                    isCompleted={editingFromReview ? false : getStepStatus(activeStep?.id) === 'completed'}
                    isEditing={editingFromReview}
                  />
                </Suspense>
              </div>
            )}

            {showOnboardingJourney && (
              <ApplicationJourney
                progress={progress}
                activeStep={activeStep}
                currentApplicationId={currentApplicationId}
                reapplicationData={reapplicationData}
                submittingFinal={submittingFinal}
                getStepStatus={getStepStatus}
                onStepClick={handleStepClick}
                onReviewAndSubmit={async () => {
                  await fetchData(true);
                  const reviewStep = applicationSteps.find((s) => s.id === 'review');
                  if (reviewStep) {
                    setEditingFromReview(false);
                    setActiveStep(reviewStep);
                  } else {
                    handleSubmitApplication();
                  }
                }}
              />
            )}

            {!isCreditBlocked &&
              !showOnboardingJourney &&
              !submittedApplication &&
              !rejectedApplication &&
              !successMessage &&
              !error && (
              <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <h2 className="text-xl font-semibold text-slate-900">Nothing to show yet</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Refresh this page, or start a new application from the welcome screen.
                </p>
                <Button
                  className="mt-6 bg-[#222222] hover:bg-[#111111] text-white"
                  onClick={() => {
                    hasAutoResumed.current = false;
                    setShowWelcome(true);
                    setActiveStep(null);
                    fetchData(true);
                  }}
                >
                  Refresh dashboard
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      </DashboardErrorBoundary>
    </MainLayout>
  );
}
