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

/** Employment type captured on the application profile — FR-CUS-07. */
export enum EmploymentType {
  Salaried = "SALARIED",
  SelfEmployed = "SELF_EMPLOYED",
}

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
