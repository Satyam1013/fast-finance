import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  IsBoolean,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
} from "class-validator";
import {
  AdminCustomersService,
  CustomerPanelFilters,
} from "./admin-customers.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";
import { toCsv } from "../common/util/csv";

class CustomerListQuery implements CustomerPanelFilters {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() loan?: string;
  @IsOptional() @IsString() onboard?: string;
  @IsOptional() @IsString() blocked?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

class PatchCustomerDto {
  @IsOptional() @IsBoolean() blocked?: boolean;
  @IsOptional() @IsString() note?: string;
}

class SetStatusDto {
  @IsString() status!: string;
  @IsOptional() @IsString() note?: string;
}

class SetStaffDto {
  @IsMongoId() staffId!: string;
}

/**
 * Admin panel "Customers" tab — one row per customer, joined with their
 * latest application. This is a *different, additive* view from the existing
 * `/admin/customers` (Aadhaar/PAN/KYC-review-oriented profile list, unchanged
 * — see CustomersController) — both stay, aimed at different screens.
 */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@Controller()
export class AdminCustomersController {
  constructor(private readonly adminCustomers: AdminCustomersService) {}

  // "customers" is the admin panel's expected bare path — nothing else uses
  // it (customer-facing routes are all under /me or /user). Static routes
  // ("export") are declared before ":id" to avoid route-order shadowing.

  @Get(["customers/export", "admin/customers/pipeline/export"])
  async export(@Query() query: CustomerListQuery, @Res() res: Response) {
    const rows = await this.adminCustomers.export(query);
    const csv = toCsv(rows, [
      { header: "id", value: (r) => r.id },
      { header: "createdAt", value: (r) => r.createdAt },
      { header: "name", value: (r) => r.name },
      { header: "phone", value: (r) => r.phone },
      { header: "dsa", value: (r) => r.dsa?.name ?? "" },
      { header: "address", value: (r) => r.address },
      { header: "state", value: (r) => r.state },
      { header: "city", value: (r) => r.city },
      { header: "pincode", value: (r) => r.pincode },
      { header: "loan", value: (r) => r.loan },
      { header: "loanAmount", value: (r) => r.loanAmount },
      { header: "status", value: (r) => r.status },
      { header: "staff", value: (r) => r.staff?.name ?? "" },
      { header: "onboard", value: (r) => r.onboard },
      { header: "blocked", value: (r) => r.blocked },
    ]);
    res
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", 'attachment; filename="customers.csv"')
      .send(csv);
  }

  @Get(["customers", "admin/customers/pipeline"])
  list(@Query() query: CustomerListQuery) {
    return this.adminCustomers.list(query);
  }

  @Get(["customers/:id", "admin/customers/pipeline/:id"])
  detail(@Param("id") id: string) {
    return this.adminCustomers.detail(id);
  }

  @Patch(["customers/:id/status", "admin/customers/:id/status"])
  setStatus(
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.adminCustomers.setStatus(id, dto.status, dto.note, actor);
  }

  @Patch(["customers/:id/staff", "admin/customers/:id/staff"])
  setStaff(
    @Param("id") id: string,
    @Body() dto: SetStaffDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.adminCustomers.setStaff(id, dto.staffId, actor);
  }

  @Patch(["customers/:id", "admin/customers/:id"])
  async patch(
    @Param("id") id: string,
    @Body() dto: PatchCustomerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    if (dto.blocked !== undefined)
      await this.adminCustomers.setBlocked(id, dto.blocked, actor);
    if (dto.note !== undefined) await this.adminCustomers.setNote(id, dto.note);
    return { success: true };
  }
}
