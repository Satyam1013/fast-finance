import { Injectable, NotImplementedException } from "@nestjs/common";

export type ReportType =
  | "customer" // FR-ADM-29
  | "disbursement" // FR-ADM-30
  | "staff-performance" // FR-ADM-31
  | "partner-commission" // FR-ADM-34
  | "gst"; // FR-ADM-28

export type ExportFormat = "pdf" | "excel";

/**
 * Every report is exportable as BOTH PDF and Excel (FR-ADM-32). One export
 * engine feeds all five report types — pick the PDF/Excel libraries once
 * (FRS §10.2). Exported PDFs carry Fast Finance branding + generation date +
 * location (FR-ADM-33).
 */
@Injectable()
export class ReportsService {
  data(_type: ReportType, _filters: Record<string, unknown>): Promise<never> {
    // TODO: assemble the row set per report type (role-scoped for partners).
    throw new NotImplementedException("reports.data — not built");
  }

  export(_type: ReportType, _format: ExportFormat): Promise<never> {
    // TODO: render rows -> exceljs workbook | pdfmake document.
    throw new NotImplementedException("reports.export — not built");
  }
}
