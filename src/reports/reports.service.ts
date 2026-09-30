import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import { CustomersService } from "../customers/customers.service";
import { StaffService, StaffAdminListFilters } from "../staff/staff.service";
import {
  PartnersService,
  DsaAdminListFilters,
} from "../partners/partners.service";
import { buildCustomerRow } from "../admin/util/build-customer-row";
import { toIdString } from "../common/util/id";
import { toCsv } from "../common/util/csv";

export type ReportType =
  | "customer" // FR-ADM-29
  | "disbursement" // FR-ADM-30
  | "staff-performance" // FR-ADM-31
  | "partner-commission" // FR-ADM-34
  | "gst"; // FR-ADM-28

export type ExportFormat = "pdf" | "excel";

export interface AdminReportFilters {
  search?: string;
  from?: string;
  to?: string;
  loan?: string;
}

/**
 * Every report is exportable as BOTH PDF and Excel (FR-ADM-32). One export
 * engine feeds all five report types — pick the PDF/Excel libraries once
 * (FRS §10.2). Exported PDFs carry Fast Finance branding + generation date +
 * location (FR-ADM-33).
 *
 * The admin-panel-facing methods below (`stats`/`customerList`/…/`exportCsv`)
 * are a separate, simpler ask (plain CSV, no PDF) — they don't touch the
 * FR-tagged skeleton above.
 */
@Injectable()
export class ReportsService {
  constructor(
    // Read-only — no module cycle (ReportsModule sits alongside AdminModule,
    // neither Applications/Customers/Staff/Partners import either of them).
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    private readonly customers: CustomersService,
    private readonly staff: StaffService,
    private readonly partners: PartnersService,
  ) {}

  data(_type: ReportType, _filters: Record<string, unknown>): Promise<never> {
    // TODO: assemble the row set per report type (role-scoped for partners).
    throw new NotImplementedException("reports.data — not built");
  }

  export(_type: ReportType, _format: ExportFormat): Promise<never> {
    // TODO: render rows -> exceljs workbook | pdfmake document.
    throw new NotImplementedException("reports.export — not built");
  }

  // ── Admin panel ──

  async panelStats() {
    const [customer, dsa, staffs] = await Promise.all([
      this.customers.countAll(),
      this.partners.counts().then((c) => c.all),
      this.staff.adminList({ limit: 1 }).then((r) => r.total),
    ]);
    return { customer, dsa, staffs };
  }

  /** Same joined shape as the admin panel's `/customers` — see CLAUDE.md. */
  async customerList(filters: AdminReportFilters) {
    const rows = await this.customers.queryForAdminPanel(filters);
    const ids = rows.map((c) => toIdString(c._id));
    const apps = ids.length
      ? await this.applications
          .find({ customerId: { $in: ids } })
          .sort({ createdAt: -1 })
          .lean()
      : [];
    const latestByCustomer = new Map<string, (typeof apps)[number]>();
    for (const a of apps) {
      if (!latestByCustomer.has(a.customerId))
        latestByCustomer.set(a.customerId, a);
    }
    const staffIds = [
      ...new Set([...latestByCustomer.values()].map((a) => a.staffId)),
    ];
    const partnerIds = [
      ...new Set(
        [...latestByCustomer.values()]
          .map((a) => a.partnerId)
          .filter((v): v is string => !!v),
      ),
    ];
    const [staffRows, partnerRows] = await Promise.all([
      this.staff.findManyByIds(staffIds),
      this.partners.findManyByIds(partnerIds),
    ]);
    const staffById = new Map(staffRows.map((s) => [s.id, s]));
    const partnerById = new Map(partnerRows.map((p) => [p.id, p]));

    let built = rows.map((c) =>
      buildCustomerRow(
        c,
        latestByCustomer.get(toIdString(c._id)),
        staffById,
        partnerById,
      ),
    );
    if (filters.loan) {
      const rx = new RegExp(filters.loan.trim(), "i");
      built = built.filter((r) => r.loan && rx.test(r.loan));
    }
    return { results: built };
  }

  dsaList(filters: DsaAdminListFilters) {
    return this.partners.adminListDsa(filters);
  }

  staffsList(filters: StaffAdminListFilters) {
    return this.staff.adminList(filters);
  }

  async exportCsv(
    type: "customer" | "dsa" | "staffs",
    filters: AdminReportFilters,
  ) {
    if (type === "customer") {
      const { results } = await this.customerList(filters);
      return toCsv(results, [
        { header: "id", value: (r) => r.id },
        { header: "name", value: (r) => r.name },
        { header: "phone", value: (r) => r.phone },
        { header: "loan", value: (r) => r.loan },
        { header: "loanAmount", value: (r) => r.loanAmount },
        { header: "status", value: (r) => r.status },
      ]);
    }
    if (type === "dsa") {
      const { results } = await this.dsaList(filters);
      return toCsv(results, [
        { header: "code", value: (r) => r.code },
        { header: "name", value: (r) => r.name },
        { header: "phone", value: (r) => r.phone },
        { header: "customersCount", value: (r) => r.customersCount },
        { header: "blocked", value: (r) => r.blocked },
      ]);
    }
    const { results } = await this.staffsList(filters);
    return toCsv(results, [
      { header: "id", value: (r) => r.id },
      { header: "name", value: (r) => r.name },
      { header: "email", value: (r) => r.email },
      { header: "customersAssigned", value: (r) => r.customersAssigned },
      { header: "blocked", value: (r) => r.blocked },
    ]);
  }
}
