/**
 * Admin-panel "Designation" — a display rank shown in the Staffs table.
 * Separate from {@link StaffRole} (which drives assignment/eligibility
 * logic elsewhere): a Staff row carries both, independently.
 */
export enum StaffDesignation {
  JuniorStaff = "JUNIOR_STAFF",
  SeniorStaff = "SENIOR_STAFF",
  TeamLead = "TEAM_LEAD",
  Manager = "MANAGER",
}

export const STAFF_DESIGNATION_LABELS: Record<StaffDesignation, string> = {
  [StaffDesignation.JuniorStaff]: "Junior Staff",
  [StaffDesignation.SeniorStaff]: "Senior Staff",
  [StaffDesignation.TeamLead]: "Team Lead",
  [StaffDesignation.Manager]: "Manager",
};
