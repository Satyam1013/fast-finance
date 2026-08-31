/** Document checklist — FRS §3.2 / §9.2, PRD C-05/C-06/C-07. */
export enum DocumentType {
  Pan = "PAN",
  Aadhaar = "AADHAAR",
  Selfie = "SELFIE",
  Address = "ADDRESS",
  SalarySlip = "SALARY_SLIP",
  BankStatement = "BANK_STATEMENT",
}

/**
 * Mandatory set that gates final submission (FR-CUS-13 / PRD C-08).
 * Stage 1 cannot be left until every one of these is at least Submitted.
 */
export const MANDATORY_DOCUMENTS: DocumentType[] = [
  DocumentType.Pan,
  DocumentType.Aadhaar,
  DocumentType.Selfie,
  DocumentType.Address,
  DocumentType.SalarySlip,
  DocumentType.BankStatement,
];

export enum DocumentStatus {
  Pending = "PENDING",
  Submitted = "SUBMITTED",
  Verified = "VERIFIED", // staff marked it verified — FR-STF-08
  Rejected = "REJECTED", // staff rejected with a note shown to the customer — PRD S-03
}

/** Bank statement only — FR-CUS-11 / §9.2 submissionMethod. */
export enum BankStatementMethod {
  AccountAggregatorOtp = "AA_OTP",
  Manual = "MANUAL",
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  [DocumentType.Pan]: "PAN Card",
  [DocumentType.Aadhaar]: "Aadhaar Card",
  [DocumentType.Selfie]: "Selfie",
  [DocumentType.Address]: "Address Proof",
  [DocumentType.SalarySlip]: "Salary Slip",
  [DocumentType.BankStatement]: "Bank Statement",
};
