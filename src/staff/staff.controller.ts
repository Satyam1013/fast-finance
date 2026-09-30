import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { StaffService, StaffAdminListFilters } from "./staff.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role, StaffDesignation, StaffRole } from "../common/constants";
import { toCsv } from "../common/util/csv";

class CreateStaffDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() phone!: string;
  @MinLength(8) password!: string;
  // Optional here — the admin panel's Add Staff form doesn't collect this;
  // it defaults server-side (see StaffService.create).
  @IsOptional() @IsEnum(StaffRole) staffRole?: StaffRole;
  @IsOptional() @IsEnum(StaffDesignation) designation?: StaffDesignation;
  @IsOptional() @IsISO8601() joiningDate?: string;
}

class SetBlockedDto {
  @IsBoolean() blocked!: boolean;
}

class SetPasswordDto {
  @MinLength(8) password!: string;
}

class StaffListQuery implements StaffAdminListFilters {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() blocked?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

// "staffs" is the admin panel's expected path — "staff" is the documented one.
@ApiTags("staff")
@ApiBearerAuth()
@Controller(["staff", "staffs"])
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  /** Staff's own profile — FR-STF-15. */
  @UseGuards(RolesGuard)
  @Roles(Role.Staff, Role.Admin)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.staff.findById(user.sub);
  }

  // ── Admin — staff management (FRS §7.3) ── static routes before ":id".

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("export")
  async export(@Query() query: StaffListQuery, @Res() res: Response) {
    const rows = await this.staff.adminExport(query);
    const csv = toCsv(rows, [
      { header: "id", value: (r) => r.id },
      { header: "createdAt", value: (r) => r.createdAt },
      { header: "name", value: (r) => r.name },
      { header: "email", value: (r) => r.email },
      { header: "phone", value: (r) => r.phone },
      { header: "designation", value: (r) => r.designationLabel },
      { header: "customersAssigned", value: (r) => r.customersAssigned },
      { header: "joiningDate", value: (r) => r.joiningDate },
      { header: "blocked", value: (r) => r.blocked },
    ]);
    res
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", 'attachment; filename="staffs.csv"')
      .send(csv);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get()
  list(@Query() query: StaffListQuery) {
    return this.staff.adminList(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get(":id")
  detail(@Param("id") id: string) {
    return this.staff.adminDetail(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staff.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch(":id")
  setBlocked(
    @Param("id") id: string,
    @Body() dto: SetBlockedDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.staff.setBlocked(id, dto.blocked, actor);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch(":id/password")
  setPassword(
    @Param("id") id: string,
    @Body() dto: SetPasswordDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.staff.setPassword(id, dto.password, actor);
  }
}
