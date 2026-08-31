/**
 * The four user roles — FRS §2.1 / PRD §3.
 *
 * One identity may hold more than one profile (a DSA who also takes a personal
 * loan). The login credential decides the active role: mobile+OTP -> CUSTOMER,
 * partner code -> PARTNER, email+password -> STAFF or ADMIN (PRD §2.2 Edge Case).
 */
export enum Role {
  Customer = "CUSTOMER",
  Partner = "PARTNER",
  Staff = "STAFF",
  Admin = "ADMIN",
}

/** Staff sub-roles — FRS §7.3 (FR-ADM-12) / §9.4. */
export enum StaffRole {
  LoanOfficer = "LOAN_OFFICER",
  RelationshipManager = "RELATIONSHIP_MANAGER",
  DocumentationExecutive = "DOCUMENTATION_EXECUTIVE",
}

/**
 * Data-scoping level for a (role, module) pair — FRS §2.2 Role Access Matrix.
 * Enforced server-side in the service/guard layer, never only in the UI
 * (NFR-02, FRS §10.1, PRD §7).
 */
export enum Scope {
  None = "NONE",
  Own = "OWN", // records belonging to the caller
  OwnLeads = "OWN_LEADS", // partner: applications they referred
  Assigned = "ASSIGNED", // staff: applications assigned to them
  All = "ALL",
}

/**
 * FRS §2.2 — machine-readable copy of the Role Access Matrix. Guards and
 * services resolve the caller's scope for a module through this map instead of
 * scattering role checks across controllers.
 */
export const ACCESS_MATRIX: Record<string, Record<Role, Scope>> = {
  ownApplicationTracking: {
    [Role.Customer]: Scope.Own,
    [Role.Partner]: Scope.None,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.None,
  },
  submitKycDocuments: {
    [Role.Customer]: Scope.Own,
    [Role.Partner]: Scope.None,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.None,
  },
  leadManagement: {
    [Role.Customer]: Scope.None,
    [Role.Partner]: Scope.Own,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.All,
  },
  commissionAndEarnings: {
    [Role.Customer]: Scope.None,
    [Role.Partner]: Scope.Own,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.All,
  },
  customerRecords: {
    [Role.Customer]: Scope.Own,
    [Role.Partner]: Scope.OwnLeads,
    [Role.Staff]: Scope.Assigned,
    [Role.Admin]: Scope.All,
  },
  advanceApplicationStage: {
    [Role.Customer]: Scope.None,
    [Role.Partner]: Scope.None,
    [Role.Staff]: Scope.Assigned,
    [Role.Admin]: Scope.All,
  },
  staffManagement: {
    [Role.Customer]: Scope.None,
    [Role.Partner]: Scope.None,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.All,
  },
  partnerManagement: {
    [Role.Customer]: Scope.None,
    [Role.Partner]: Scope.None,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.All,
  },
  servicesCatalogue: {
    [Role.Customer]: Scope.Own, // view only
    [Role.Partner]: Scope.Own, // view only
    [Role.Staff]: Scope.Own, // view only
    [Role.Admin]: Scope.All, // manage
  },
  gstDashboard: {
    [Role.Customer]: Scope.None,
    [Role.Partner]: Scope.None,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.All,
  },
  reportsAndExports: {
    [Role.Customer]: Scope.None,
    [Role.Partner]: Scope.Own,
    [Role.Staff]: Scope.None,
    [Role.Admin]: Scope.All,
  },
};

export type AccessModule = keyof typeof ACCESS_MATRIX;

export function scopeFor(module: AccessModule, role: Role): Scope {
  return ACCESS_MATRIX[module]?.[role] ?? Scope.None;
}
