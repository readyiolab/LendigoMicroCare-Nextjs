import {
  ShieldCheck,
  CheckCircle2,
  Camera,
  FileUp,
  Users,
  Banknote,
  Fingerprint,
} from "lucide-react";

import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";

const EligibilityForm = lazy(() => import("@/components/forms/steps/EligibilityForm"));
const SelfieForm = lazy(() => import("@/components/forms/steps/SelfieForm"));
const BankStatementForm = lazy(() => import("@/components/forms/steps/BankStatementForm"));
const ReferenceForm = lazy(() => import("@/components/forms/steps/ReferenceForm"));
const BankDetailsForm = lazy(() => import("@/components/forms/steps/BankDetailsForm"));
const EkycVerificationForm = lazy(() => import("@/components/forms/steps/EkycVerificationForm"));
const ReviewForm = lazy(() => import("@/components/forms/steps/ReviewForm"));

export const IN_FLIGHT_APPLICATION_STATUSES = new Set([
  'submitted',
  'under_review',
  'offer_sent',
  'offer_accepted',
  'approved',
  'video_declaration_pending',
  'video_declaration_submitted',
  'video_declaration_rejected',
  'esign_pending',
  'esign_completed',
  'mandate_pending',
  'payment_pending',
]);

export const LOAN_PURPOSES = [
  { value: "personal", label: "Personal Expenses" },
  { value: "medical", label: "Medical Emergency" },
  { value: "education", label: "Education" },
  { value: "wedding", label: "Wedding" },
  { value: "home_renovation", label: "Home Renovation" },
  { value: "debt_consolidation", label: "Debt Consolidation" },
  { value: "business", label: "Business Needs" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

export const applicationSteps = [
  {
    id: "eligibility",
    label: "Check Eligibility",
    description: "See if you're eligible—fast and easy!",
    icon: CheckCircle2,
    color: "#000000",
    component: EligibilityForm,
  },
  {
    id: "selfie",
    label: "Selfie Upload",
    description: "Share your selfie and complete the registration.",
    icon: Camera,
    color: "#000000",
    component: SelfieForm,
  },
  {
    id: "ekyc",
    label: "eKYC Verification",
    description: "Verify your identity and address instantly.",
    icon: Fingerprint,
    color: "#000000",
    component: EkycVerificationForm,
  },
  {
    id: "reference",
    label: "Reference Details",
    description: "Add a trusted contact for verification.",
    icon: Users,
    color: "#000000",
    component: ReferenceForm,
  },
  {
    id: "disbursal_bank",
    label: "Disbursal Bank Details",
    description: "Enter your Bank details for Disbursal.",
    icon: Banknote,
    color: "#000000",
    component: BankDetailsForm,
  },
  {
    id: "bank_statement",
    label: "Fetch Bank Statement",
    description: "Upload your latest bank statement.",
    icon: FileUp,
    color: "#000000",
    component: BankStatementForm,
  },
  {
    id: "review",
    label: "Review Application",
    description: "Verify all details before final submission.",
    icon: ShieldCheck,
    color: "#000000",
    component: ReviewForm,
  },
];

export const getErrorMessage = (err) => {
  if (err.response && err.response.data) {
    const data = err.response.data;
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors[0].msg;
    }
    if (data.message) {
      return data.message;
    }
    if (data.error) {
      return data.error;
    }
  }
  return err.message || "An unexpected error occurred";
};

export const isOfferApplication = (app) => {
  if (!app) return false;
  const offerStatuses = ['offer_sent', 'pending_offer'];
  return (
    offerStatuses.includes(app.application_status) ||
    app.customer_status === 'pending_offer' ||
    app.internal_status === 'offer_sent'
  );
};

export const WELCOME_CONTEXT_PHASES = new Set([
  'onboarding',
  'reapply_eligible',
  'eligibility_required',
]);
