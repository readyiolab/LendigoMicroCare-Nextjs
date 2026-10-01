import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import CreditEligibilityBanner from "@/components/loans/CreditEligibilityBanner";
import {
  CheckCircle2,
  ArrowRight,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { applicationSteps } from "./applicationSteps";

/**
 * Cool-off / credit blocked UI. Shown whenever creditEligibility.allowed === false.
 */
export function CreditBlockedPanel({ creditEligibility }) {
  if (!creditEligibility) {
    return (
      <div
        className="rounded-lg border-2 border-amber-200 bg-amber-50 text-amber-950 p-5 mb-6 shadow-sm"
        role="alert"
      >
        <h2 className="text-base font-semibold">Application temporarily unavailable</h2>
        <p className="text-sm mt-1 text-amber-900/80">
          You cannot continue a new application right now. Please try again later or contact support.
        </p>
      </div>
    );
  }
  if (creditEligibility.allowed !== false) return null;
  return <CreditEligibilityBanner creditEligibility={creditEligibility} />;
}

export function RejectedApplicationPanel({
  creatingApplication,
  creditEligibility,
  onStartApplication,
}) {
  return (
    <div className="max-w-3xl mx-auto mb-8">
      <Card className="border-red-100 shadow-sm bg-red-50/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0 p-3 bg-red-100 rounded-full">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
              <h2 className="text-lg font-semibold text-gray-900">Application Not Approved</h2>
              <Button
                onClick={onStartApplication}
                disabled={creatingApplication || creditEligibility?.allowed === false}
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-50 text-gray-900 border-gray-200 shrink-0"
              >
                {creatingApplication ? (
                  <>
                    <Spinner className="w-3.5 h-3.5 mr-2" /> Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2" /> Re-apply
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ApplicationJourney({
  progress,
  activeStep,
  currentApplicationId,
  reapplicationData,
  submittingFinal,
  getStepStatus,
  onStepClick,
  onReviewAndSubmit,
}) {
  return (
    <>
      {currentApplicationId && progress && progress.completedSteps >= 7 && !activeStep && (
        <div className="mb-8 flex flex-col items-center text-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="flex flex-col items-center space-y-4 max-w-lg">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#222222] rounded-full shadow-lg mb-2">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                  Application Ready
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  All steps completed. You can now submit for review.
                </p>
              </div>
            </div>

            <Button
              onClick={onReviewAndSubmit}
              disabled={submittingFinal}
              className="bg-[#222222] hover:bg-[#111111] text-white font-semibold h-11 px-6 rounded-lg transition-all duration-300 active:scale-[0.98] text-sm group relative shadow-md shadow-[#222222]/20"
            >
              {submittingFinal ? (
                <div className="flex items-center gap-2">
                  <Spinner className="w-4 h-4 text-white" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Review & submit</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </div>
        </div>
      )}

      {!activeStep && (
        <div className="max-w-5xl mx-auto px-1 sm:px-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Application Journey
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Complete these steps to unlock your loan offer.
              </p>
            </div>
            {progress && (
              <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-slate-100">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-medium leading-none">Progress</div>
                  <div className="text-sm font-semibold text-[#222222] leading-tight mt-0.5">
                    {progress.completedSteps >= 7 ? 100 : progress.progressPercent || 0}%
                  </div>
                </div>
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    progress.completedSteps >= 7
                      ? "bg-teal-600 shadow-sm shadow-teal-200"
                      : "bg-teal-50 border border-teal-100"
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      progress.completedSteps >= 7 ? "text-white" : "text-slate-300"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {progress && (
            <div className="mb-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#222222] via-[#1A1A1A] to-teal-500 rounded-full transition-all duration-500"
                style={{
                  width: `${progress.completedSteps >= 7 ? 100 : progress.progressPercent || 0}%`,
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {applicationSteps.map((step) => {
              const Icon = step.icon;
              const status = getStepStatus(step.id);
              const isCompleted = status === "completed";
              const isMandatoryNew =
                step.id === "bank_statement" &&
                reapplicationData?.isReturningUser &&
                !isCompleted;

              const firstIncompleteStep = applicationSteps.find(
                (s) => getStepStatus(s.id) !== "completed"
              );
              const isNextStep = firstIncompleteStep?.id === step.id;
              const isClickable = !isCompleted;

              return (
                <div
                  key={step.id}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  className={`
                            group flex flex-col p-3.5 rounded-lg border bg-white transition-all
                            ${
                              isCompleted
                                ? "bg-slate-50/60 border-slate-100"
                                : isNextStep
                                  ? "border-[#222222] shadow-md shadow-[#222222]/5 cursor-pointer ring-1 ring-[#222222]/10"
                                  : "border-slate-100 hover:border-slate-300 cursor-pointer"
                            }
                        `}
                  onClick={() => isClickable && onStepClick(step)}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onStepClick(step);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className={`
                              w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                              ${
                                isCompleted
                                  ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                                  : isNextStep
                                    ? "bg-[#222222] text-white shadow-sm"
                                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-700"
                              }
                            `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {isCompleted ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </span>
                    ) : isNextStep ? (
                      <span className="px-2 py-0.5 bg-[#222222] text-white text-[10px] font-medium rounded-md shrink-0">
                        Next
                      </span>
                    ) : null}
                  </div>

                  <h3
                    className={`text-sm font-semibold leading-tight ${
                      isCompleted ? "text-slate-400" : "text-[#222222]"
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p
                    className={`text-[11px] leading-snug line-clamp-2 mt-0.5 flex-1 ${
                      isCompleted ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {isMandatoryNew ? "Updated bank statement required" : step.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    {isCompleted ? (
                      <span className="text-[11px] font-medium text-teal-600">Completed</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          isNextStep
                            ? "text-[#222222]"
                            : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      >
                        {isMandatoryNew ? "Upload now" : "Continue"}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
