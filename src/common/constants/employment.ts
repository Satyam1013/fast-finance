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
