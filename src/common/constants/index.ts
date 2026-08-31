export * from "./stage";
export * from "./roles";
export * from "./documents";

/** Lead / application status buckets shown to Partner — FR-PTR-13 / PRD P-07. */
export enum LeadStatus {
  InProgress = "IN_PROGRESS",
  Disbursed = "DISBURSED",
  Rejected = "REJECTED",
}

/** Commission payout status — FRS §9.7. */
export enum CommissionStatus {
  Payable = "PAYABLE",
  Paid = "PAID",
}

/** GST monthly ledger row status — FRS §9.8. */
export enum GstStatus {
  Paid = "PAID",
  Due = "DUE",
}

/** Partner account + verification status — FRS §9.5. */
export enum PartnerStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

export enum VerificationStatus {
  Pending = "PENDING",
  Verified = "VERIFIED",
}

/**
 * Binary split used for loan eligibility / document rules — FR-CUS-07, §9.1.
 * Derived from {@link EmploymentCategory} via {@link employmentTypeFor}.
 */
export enum EmploymentType {
  Salaried = "SALARIED",
  SelfEmployed = "SELF_EMPLOYED",
}

/**
 * "Type of Employment" dropdown on the customer profile (Create/Edit Profile
 * screens). The mobile mock shows values like "Private Limited", so this is a
 * company/engagement-type list, not the binary split.
 *
 * TODO(business): confirm the final option set — PRD Open Questions.
 */
export enum EmploymentCategory {
  SalariedPrivate = "SALARIED_PRIVATE",
  SalariedGovernment = "SALARIED_GOVERNMENT",
  SalariedPsu = "SALARIED_PSU",
  SalariedMnc = "SALARIED_MNC",
  SelfEmployedProfessional = "SELF_EMPLOYED_PROFESSIONAL",
  SelfEmployedBusiness = "SELF_EMPLOYED_BUSINESS",
  Proprietorship = "PROPRIETORSHIP",
  Partnership = "PARTNERSHIP",
  PrivateLimited = "PRIVATE_LIMITED",
  Llp = "LLP",
}

const SELF_EMPLOYED_CATEGORIES = new Set<EmploymentCategory>([
  EmploymentCategory.SelfEmployedProfessional,
  EmploymentCategory.SelfEmployedBusiness,
  EmploymentCategory.Proprietorship,
  EmploymentCategory.Partnership,
  EmploymentCategory.PrivateLimited,
  EmploymentCategory.Llp,
]);

/** Map the profile dropdown value to the binary eligibility split. */
export function employmentTypeFor(
  category?: EmploymentCategory,
): EmploymentType | undefined {
  if (!category) return undefined;
  return SELF_EMPLOYED_CATEGORIES.has(category)
    ? EmploymentType.SelfEmployed
    : EmploymentType.Salaried;
}

export const EMPLOYMENT_CATEGORY_LABELS: Record<EmploymentCategory, string> = {
  [EmploymentCategory.SalariedPrivate]: "Salaried — Private",
  [EmploymentCategory.SalariedGovernment]: "Salaried — Government",
  [EmploymentCategory.SalariedPsu]: "Salaried — PSU",
  [EmploymentCategory.SalariedMnc]: "Salaried — MNC",
  [EmploymentCategory.SelfEmployedProfessional]: "Self-Employed Professional",
  [EmploymentCategory.SelfEmployedBusiness]: "Self-Employed Business",
  [EmploymentCategory.Proprietorship]: "Proprietorship",
  [EmploymentCategory.Partnership]: "Partnership",
  [EmploymentCategory.PrivateLimited]: "Private Limited",
  [EmploymentCategory.Llp]: "LLP",
};

/** Audited actions for the trail — PRD A-13. */
export enum AuditAction {
  StageAdvanced = "STAGE_ADVANCED",
  StageReverted = "STAGE_REVERTED",
  ApplicationRejected = "APPLICATION_REJECTED",
  DocumentVerified = "DOCUMENT_VERIFIED",
  DocumentRejected = "DOCUMENT_REJECTED",
  StaffReassigned = "STAFF_REASSIGNED",
  CommissionCalculated = "COMMISSION_CALCULATED",
  ProductActivated = "PRODUCT_ACTIVATED",
  ProductDeactivated = "PRODUCT_DEACTIVATED",
}
