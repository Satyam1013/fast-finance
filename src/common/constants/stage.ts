/**
 * Application lifecycle — FRS §3.1 / PRD §6.
 *
 * `stage` is the single source of truth shared across all four roles. It is
 * stored as an integer 1–7 on the Application entity (never derived), with a
 * SEPARATE `isRejected` flag — an application can be rejected from any stage
 * without losing the stage it was rejected at (FRS §3.1 Developer Note).
 *
 * Rules (PRD §6.1):
 *  - stages advance one at a time; skipping is not permitted
 *  - an application cannot leave stage 1 until all mandatory documents are Submitted
 *  - only Admin may move an application backwards, and every such move is logged
 *  - once Disbursed (7) the application is locked against further changes
 */
export enum Stage {
  ApplicationSubmitted = 1,
  CreditEvaluation = 2,
  LoanOffer = 3,
  AdditionalDocuments = 4,
  NachKycAgreement = 5,
  FinalReview = 6,
  Disbursed = 7,
}

// Typed as plain numbers so range loops / comparisons don't trip the
// no-unsafe-enum-comparison rule. Stage-typed values still compare fine.
export const FIRST_STAGE: number = Stage.ApplicationSubmitted;
export const FINAL_STAGE: number = Stage.Disbursed;

/** Next stage in the fixed sequence. Advancing is always +1 (PRD §6.1). */
export function nextStage(current: Stage): Stage {
  return (current + 1) as Stage;
}

/** Previous stage — Admin-only backward correction (PRD §6.1 / A-03). */
export function previousStage(current: Stage): Stage {
  return (current - 1) as Stage;
}

export const STAGE_LABELS: Record<Stage, string> = {
  [Stage.ApplicationSubmitted]: "Application Submitted",
  [Stage.CreditEvaluation]: "Credit Evaluation",
  [Stage.LoanOffer]: "Loan Offer",
  [Stage.AdditionalDocuments]: "Additional Documents",
  [Stage.NachKycAgreement]: "NACH, KYC & Agreement",
  [Stage.FinalReview]: "Final Review",
  [Stage.Disbursed]: "Disbursed",
};

/** Plain-language line shown to the customer for the current stage (FR-CUS-16). */
export const STAGE_CUSTOMER_MESSAGE: Record<Stage, string> = {
  [Stage.ApplicationSubmitted]:
    "We have received your application and are checking your documents.",
  [Stage.CreditEvaluation]:
    "Our credit team is reviewing your profile and documents.",
  [Stage.LoanOffer]:
    "Your loan offer is ready. Please review and accept it to continue.",
  [Stage.AdditionalDocuments]:
    "The lender needs a few more documents. Please upload the pending items.",
  [Stage.NachKycAgreement]:
    "Please complete the auto-debit setup, final KYC and sign the agreement.",
  [Stage.FinalReview]:
    "We are doing a final check before your loan amount is released.",
  [Stage.Disbursed]:
    "Your loan amount has been disbursed. This application is now closed.",
};

/** Short label the mobile app shows above each tracker step (matches the mock). */
export const STAGE_SHORT_LABELS: Record<Stage, string> = {
  [Stage.ApplicationSubmitted]: "Application",
  [Stage.CreditEvaluation]: "Credit Evaluation",
  [Stage.LoanOffer]: "Loan Offer",
  [Stage.AdditionalDocuments]: "Additional Document",
  [Stage.NachKycAgreement]: "NACH, KYC & Agreement",
  [Stage.FinalReview]: "Final Review",
  [Stage.Disbursed]: "Disbursed",
};

export type StageStepStatus = "completed" | "current" | "pending";

export interface StageStep {
  stage: number;
  step: number;
  label: string;
  status: StageStepStatus;
}

/**
 * The 7-step tracker for a given application state — FR-CUS-15. A rejected
 * application freezes: the stage it was rejected at is "current", earlier steps
 * "completed", later steps "pending" (rejection is shown separately — §3.1).
 */
export function buildStageTracker(
  currentStage: number,
  isRejected = false,
): StageStep[] {
  const stages = (
    Object.values(Stage).filter((v) => typeof v === "number") as number[]
  ).sort((a, b) => a - b);

  return stages.map((stage) => {
    let status: StageStepStatus;
    if (stage < currentStage) status = "completed";
    else if (stage > currentStage) status = "pending";
    else if (stage === FINAL_STAGE && !isRejected) status = "completed";
    else status = "current";
    return {
      stage,
      step: stage,
      label: STAGE_SHORT_LABELS[stage as Stage],
      status,
    };
  });
}
