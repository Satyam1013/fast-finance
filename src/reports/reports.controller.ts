import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import type { ReportType, ExportFormat } from "./reports.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@Controller("admin/reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

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
