import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsISO8601, IsOptional, IsString } from "class-validator";
import { ReportsService } from "./reports.service";
import type { ReportType, ExportFormat } from "./reports.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";

class PanelReportQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() loan?: string;
  @IsOptional() @IsString() blocked?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

class ExportQuery extends PanelReportQuery {
  @IsIn(["customer", "dsa", "staffs"])
  type!: "customer" | "dsa" | "staffs";
}

/**
 * "reports" (bare) is the admin panel's expected prefix — "admin/reports" is
 * the documented, FR-tagged one (5 report types, PDF/Excel — still a
 * skeleton). Static admin-panel routes are declared before the ":type"
 * catch-all so they aren't swallowed by it.
 */
@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@Controller(["admin/reports", "reports"])
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("stats")
  stats() {
    return this.reports.panelStats();
  }

  @Get("customer")
  customer(@Query() query: PanelReportQuery) {
    return this.reports.customerList(query);
  }

  @Get("dsa")
  dsa(@Query() query: PanelReportQuery) {
    return this.reports.dsaList(query);
  }

  @Get("staffs")
  staffs(@Query() query: PanelReportQuery) {
    return this.reports.staffsList(query);
  }

  @Get("export")
  async exportCsv(@Query() query: ExportQuery, @Res() res: Response) {
    const csv = await this.reports.exportCsv(query.type, query);
    res
      .header("Content-Type", "text/csv")
      .header(
        "Content-Disposition",
        `attachment; filename="${query.type}-report.csv"`,
      )
      .send(csv);
  }

  // ── FR-ADM-28..34 — the original 5-report-type skeleton (unbuilt) ──

  @Get(":type")
  data(@Param("type") type: ReportType) {
    return this.reports.data(type, {});
  }

  /** FR-ADM-32 — ?format=pdf | excel. */
  @Get(":type/export")
  export(
    @Param("type") type: ReportType,
    @Query("format") format: ExportFormat = "pdf",
  ) {
    return this.reports.export(type, format);
  }
}
