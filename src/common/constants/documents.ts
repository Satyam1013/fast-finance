import { EmploymentType } from "./employment";

/**
 * Document checklist — FRS §3.2 / §9.2, PRD C-05/C-06/C-07, extended per the
 * per-category checklists shown in the Figma "required documents" info panels
 * (Personal/Business Loan, Home/Mortgage Loan, Car Loan, Insurance).
 */
export enum DocumentType {
  Pan = "PAN",
  Aadhaar = "AADHAAR",
  Selfie = "SELFIE",
  Address = "ADDRESS",
  SalarySlip = "SALARY_SLIP",
  BankStatement = "BANK_STATEMENT",
  // ── category-specific (Figma) ──
  PassportPhoto = "PASSPORT_PHOTO",
  EmploymentId = "EMPLOYMENT_ID",
  ElectricityBill = "ELECTRICITY_BILL",
  Itr = "ITR",
  BusinessProof = "BUSINESS_PROOF",
  CoApplicantAadhaar = "CO_APPLICANT_AADHAAR",
  CoApplicantPan = "CO_APPLICANT_PAN",
  CoApplicantPhoto = "CO_APPLICANT_PHOTO",
  Cheque = "CHEQUE",
  IncomeProof = "INCOME_PROOF",
  PropertyPapers = "PROPERTY_PAPERS",
  PropertyMapEstimate = "PROPERTY_MAP_ESTIMATE",
  VehicleRc = "VEHICLE_RC",
  VehicleInsurance = "VEHICLE_INSURANCE",
  SellerKyc = "SELLER_KYC",
  SaleAgreement = "SALE_AGREEMENT",
  ExistingPolicy = "EXISTING_POLICY",
}

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
  [DocumentType.PassportPhoto]: "Passport Size Photo",
  [DocumentType.EmploymentId]: "Employment / Company ID",
  [DocumentType.ElectricityBill]: "Electricity Bill",
  [DocumentType.Itr]: "ITR / Income Proof",
  [DocumentType.BusinessProof]: "Business Proof / GST",
  [DocumentType.CoApplicantAadhaar]: "Co-Applicant Aadhaar",
  [DocumentType.CoApplicantPan]: "Co-Applicant PAN",
  [DocumentType.CoApplicantPhoto]: "Co-Applicant Photo",
  [DocumentType.Cheque]: "Cancelled Cheque",
  [DocumentType.IncomeProof]: "Income Proof",
  [DocumentType.PropertyPapers]: "Property Papers",
  [DocumentType.PropertyMapEstimate]: "Property Map & Estimate",
  [DocumentType.VehicleRc]: "Vehicle RC",
  [DocumentType.VehicleInsurance]: "Vehicle Insurance",
  [DocumentType.SellerKyc]: "Seller's KYC Documents",
  [DocumentType.SaleAgreement]: "Sale Agreement / Transfer Documents",
  [DocumentType.ExistingPolicy]: "Existing Insurance Policy",
};

const BASE: DocumentType[] = [
  DocumentType.Aadhaar,
  DocumentType.Pan,
  DocumentType.Selfie,
];

/** Personal Loan — salaried applicant. */
const PERSONAL_LOAN_SALARIED: DocumentType[] = [
  ...BASE,
  DocumentType.SalarySlip,
  DocumentType.BankStatement,
  DocumentType.EmploymentId,
  DocumentType.Address,
  DocumentType.PassportPhoto,
  DocumentType.ElectricityBill,
];

/** Personal Loan (self-employed) and Business Loan — same checklist (Figma). */
const SELF_EMPLOYED_OR_BUSINESS: DocumentType[] = [
  ...BASE,
  DocumentType.BankStatement,
  DocumentType.Itr,
  DocumentType.BusinessProof,
  DocumentType.Address,
  DocumentType.ElectricityBill,
  DocumentType.PassportPhoto,
  DocumentType.CoApplicantAadhaar,
  DocumentType.CoApplicantPan,
  DocumentType.CoApplicantPhoto,
];

/** Home Loan / Mortgage Loan (LAP). */
const HOME_OR_MORTGAGE_LOAN: DocumentType[] = [
  ...BASE,
  DocumentType.PassportPhoto,
  DocumentType.Cheque,
  DocumentType.IncomeProof,
  DocumentType.BankStatement,
  DocumentType.PropertyPapers,
  DocumentType.PropertyMapEstimate,
  DocumentType.CoApplicantAadhaar,
  DocumentType.CoApplicantPan,
  DocumentType.CoApplicantPhoto,
];

/** Car Loan (used/old car, per the Figma checklist). */
const CAR_LOAN: DocumentType[] = [
  ...BASE,
  DocumentType.Address,
  DocumentType.BankStatement,
  DocumentType.SalarySlip,
  DocumentType.PassportPhoto,
  DocumentType.VehicleRc,
  DocumentType.VehicleInsurance,
  DocumentType.SellerKyc,
  DocumentType.SaleAgreement,
];

/** Insurance — core KYC + the existing policy; bank details are conditional per Figma, not mandatory. */
const INSURANCE: DocumentType[] = [
  ...BASE,
  DocumentType.Address,
  DocumentType.PassportPhoto,
  DocumentType.ExistingPolicy,
];

/** Fallback for any product code not mapped below. */
const GENERIC: DocumentType[] = [
  ...BASE,
  DocumentType.Address,
  DocumentType.SalarySlip,
  DocumentType.BankStatement,
];

/**
 * Per-category mandatory checklist (FR-CUS-13 / PRD C-08), keyed by
 * {@link Product.code}. Personal Loan splits by employment type; every other
 * category has one fixed list. Confirm with the business before adding new
 * product codes without a mapping here — they fall back to {@link GENERIC}.
 */
export function requiredDocumentsFor(
  productCode: string,
  employmentType?: EmploymentType,
): DocumentType[] {
  switch (productCode.toUpperCase()) {
    case "PL":
      return employmentType === EmploymentType.SelfEmployed
        ? SELF_EMPLOYED_OR_BUSINESS
        : PERSONAL_LOAN_SALARIED;
    case "BL":
      return SELF_EMPLOYED_OR_BUSINESS;
    case "HL":
    case "MLAP":
      return HOME_OR_MORTGAGE_LOAN;
    case "CL":
      return CAR_LOAN;
    case "INS":
      return INSURANCE;
    default:
      return GENERIC;
  }
}
