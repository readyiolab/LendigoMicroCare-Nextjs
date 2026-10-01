import { useState, useEffect, useRef, useCallback } from "react";
import { offerAPI } from "@/lib/api/offer";
import { loanAPI } from "@/lib/api/loan";
import {
  applicationSteps,
  isOfferApplication,
  WELCOME_CONTEXT_PHASES,
  getErrorMessage,
} from "./applicationSteps";

/**
 * Dashboard data loading: applications/progress/profile state, fetchData, getOffer.
 * Leaves activeStep ownership in Dashboard; accepts setActiveStep + hasAutoResumed.
 */
export function useDashboardData({ userId, applicationUpdate, hasAutoResumed, setActiveStep }) {
  const fetchDataRef = useRef(null);

  const [applications, setApplications] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [creatingApplication, setCreatingApplication] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [currentApplicationId, setCurrentApplicationId] = useState(null);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [rejectedApplication, setRejectedApplication] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [repaymentSummary, setRepaymentSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [kycData, setKycData] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [references, setReferences] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [bankStatement, setBankStatement] = useState(null);
  const [salarySlips, setSalarySlips] = useState(null);
  const [residenceProofs, setResidenceProofs] = useState(null);
  const [reapplicationData, setReapplicationData] = useState(null);
  const [creditEligibility, setCreditEligibility] = useState(null);
  const [videoDeclarationStatus, setVideoDeclarationStatus] = useState(null);

  const isCreditBlocked = creditEligibility?.allowed === false;
  const hasDraftApplication =
    submittedApplication?.application_status === "draft" ||
    submittedApplication?.status === "draft";
  // Draft customers can finish all onboarding steps even during cool-off.
  // Cool-off only blocks starting a brand-new application.
  const showOnboardingJourney =
    !!hasDraftApplication || (!isCreditBlocked && !submittedApplication);

  const getOffer = useCallback(
    async (appId) => {
      const idToUse = appId || currentApplicationId || submittedApplication?.id;
      if (!idToUse) return;

      try {
        setLoadingOffer(true);
        const offerResponse = await offerAPI.getOffer(idToUse);
        if (offerResponse.status === 1) {
          setPendingOffer(offerResponse.data);
        }
      } catch (offerErr) {
        console.error("Failed to fetch offer:", offerErr);
      } finally {
        setLoadingOffer(false);
      }
    },
    [currentApplicationId, submittedApplication?.id]
  );

  const fetchData = useCallback(
    async (isSync = false, openNext = false, ignoreStepId = null) => {
      if (isSync) setRefreshing(true);
      else {
        setLoading(true);
        setSubmittedApplication(null);
        setRejectedApplication(null);
      }

      setError("");

      try {
        const statusResponse = await loanAPI.getDashboardStatus({ t: Date.now() });
        if (statusResponse.status === 1) {
          const data = statusResponse.data;

          if (data.profile) {
            setUserProfile(data.profile);
          }

          if (data.kyc) {
            setKycData(data.kyc);
          }

          if (data.bankDetails) {
            setBankDetails(data.bankDetails);
          }

          if (data.references) {
            setReferences(data.references);
          }

          if (data.selfie) {
            setSelfie(data.selfie);
          }

          if (Object.prototype.hasOwnProperty.call(data, "bankStatement")) {
            setBankStatement(data.bankStatement || null);
          }

          if (Object.prototype.hasOwnProperty.call(data, "salarySlips")) {
            setSalarySlips(Array.isArray(data.salarySlips) ? data.salarySlips : []);
          }

          if (Array.isArray(data.residenceProofs)) {
            setResidenceProofs(data.residenceProofs);
          }

          if (data.videoDeclarationStatus) {
            setVideoDeclarationStatus(data.videoDeclarationStatus);
          }

          if (data.existingApplication) {
            const applicationWithMetadata = {
              ...data.existingApplication,
              profile: data.profile || null,
              kyc: data.kyc || null,
              bankSummary: data.existingApplication.bankSummary || null,
            };
            setSubmittedApplication(applicationWithMetadata);
            setCurrentApplicationId(data.existingApplication.id);

            if (data.offerSummary) {
              setPendingOffer(data.offerSummary);
            } else if (isOfferApplication(data.existingApplication)) {
              getOffer(data.existingApplication.id);
            }
          }

          if (data.repaymentSummary) {
            setRepaymentSummary(data.repaymentSummary);
          }

          if (data.lastRejectedApplication) {
            setRejectedApplication(data.lastRejectedApplication);
          }

          if (data.reapplicationData) {
            setReapplicationData(data.reapplicationData);
          }

          if (data.creditEligibility) {
            setCreditEligibility(data.creditEligibility);
            if (data.creditEligibility.allowed === false) {
              const isDraft =
                data.existingApplication?.application_status === "draft" ||
                data.existingApplication?.status === "draft";
              // Keep draft step open so customer can finish onboarding
              if (!isDraft) {
                setActiveStep(null);
                hasAutoResumed.current = true;
              }
            }
          }

          if (data.existingApplication && data.existingApplication.application_status !== "draft") {
            if (!isSync) setLoading(false);
            setRefreshing(false);
            setShowWelcome(false);
            return;
          }

          const progressData = data.progress || null;
          if (progressData) {
            const isReturningWithoutApp =
              data.reapplicationData?.isReturningUser && !data.existingApplication;
            const hasStartedApplication =
              progressData.completedSteps > 0 ||
              !!data.existingApplication ||
              !!data.lastRejectedApplication;
            setShowWelcome(
              data.customerContext
                ? WELCOME_CONTEXT_PHASES.has(data.customerContext.phase)
                : !hasStartedApplication || isReturningWithoutApp
            );
            // HANDLE STALE DATA: If server returns the step we just finished as 'pending'
            // we merge the server data with our optimistic knowledge.
            setProgress((prev) => {
              if (ignoreStepId && progressData.currentStep === ignoreStepId) {
                return {
                  ...progressData,
                  completedSteps: Math.max(progressData.completedSteps, prev?.completedSteps || 0),
                  progressPercent: Math.max(
                    progressData.progressPercent || 0,
                    prev?.progressPercent || 0
                  ),
                  steps: progressData.steps.map((s) =>
                    s.name === ignoreStepId ? { ...s, status: "completed" } : s
                  ),
                };
              }
              return progressData;
            });

            // Automatically open next step if requested and not all steps done
            if (openNext && progressData.completedSteps < 7) {
              let nextStepId = progressData.currentStep;

              // Handle stale data: if the "current step" from server is the one we just finished
              if (ignoreStepId && nextStepId === ignoreStepId) {
                const currentIndex = applicationSteps.findIndex((s) => s.id === ignoreStepId);
                if (currentIndex !== -1 && currentIndex < applicationSteps.length - 1) {
                  nextStepId = applicationSteps[currentIndex + 1].id;
                }
              }

              const eligibilityDone =
                progressData.steps?.find((s) => s.name === "eligibility")?.status === "completed";
              if (!eligibilityDone) {
                nextStepId = "eligibility";
              }

              if (nextStepId) {
                const nextStep = applicationSteps.find((s) => s.id === nextStepId);
                if (nextStep) {
                  setActiveStep(nextStep);
                }
              }
            }
          } else {
            setShowWelcome(true);
          }
        }
      } catch (err) {
        console.error("Fetch data error:", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setInitialLoadDone(true);
      }
    },
    [getOffer, hasAutoResumed, setActiveStep]
  );

  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (!userId) return;
    setApplications([]);
    setProgress(null);
    setSubmittedApplication(null);
    setRejectedApplication(null);
    setPendingOffer(null);
    setCurrentApplicationId(null);
    setUserProfile(null);
    setKycData(null);
    setBankDetails(null);
    setReferences(null);
    setSelfie(null);
    setBankStatement(null);
    setSalarySlips(null);
    setReapplicationData(null);
    setCreditEligibility(null);
    setRepaymentSummary(null);
    setInitialLoadDone(false);
    hasAutoResumed.current = false;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // REAL-TIME SYNC: Refresh data when a status update is received via Socket.io
  useEffect(() => {
    if (applicationUpdate) {
      console.log("[Dashboard] Received real-time status update:", applicationUpdate);
      fetchData(true); // Sync mode
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationUpdate]);

  const getStepStatus = useCallback(
    (stepId) => {
      if (!progress || !progress.steps) {
        return "pending";
      }
      const step = progress.steps.find((s) => s.name === stepId);
      return step?.status || "pending";
    },
    [progress]
  );

  return {
    applications,
    setApplications,
    progress,
    setProgress,
    loading,
    setLoading,
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
    setRejectedApplication,
    pendingOffer,
    setPendingOffer,
    loadingOffer,
    setLoadingOffer,
    initialLoadDone,
    setInitialLoadDone,
    repaymentSummary,
    setRepaymentSummary,
    refreshing,
    setRefreshing,
    userProfile,
    setUserProfile,
    kycData,
    setKycData,
    bankDetails,
    setBankDetails,
    references,
    setReferences,
    selfie,
    setSelfie,
    bankStatement,
    setBankStatement,
    salarySlips,
    setSalarySlips,
    residenceProofs,
    setResidenceProofs,
    reapplicationData,
    setReapplicationData,
    creditEligibility,
    setCreditEligibility,
    videoDeclarationStatus,
    setVideoDeclarationStatus,
    isCreditBlocked,
    hasDraftApplication,
    showOnboardingJourney,
    getOffer,
    fetchData,
    fetchDataRef,
    getStepStatus,
  };
}
