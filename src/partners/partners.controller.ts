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
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
} from "class-validator";
import { PartnersService, DsaAdminListFilters } from "./partners.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";
import { toCsv } from "../common/util/csv";

class OnboardPartnerDto {
  @IsString() name!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() city?: string;
}

class SetBlockedDto {
  @IsBoolean() blocked!: boolean;
}

class SetStaffDto {
  @IsMongoId() staffId!: string;
}

class DsaListQuery implements DsaAdminListFilters {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() blocked?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

// "dsas" is the admin panel's expected path — "partners" is the documented one.
@ApiTags("partners")
@ApiBearerAuth()
@Controller(["partners", "dsas"])
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  // ── Partner self-service ──
  @UseGuards(RolesGuard)
  @Roles(Role.Partner)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.partners.getOwnProfile(user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Partner)
  @Get("me/referral-link")
  referralLink(@CurrentUser() user: AuthUser) {
    return this.partners.referralLink(user);
  }

  // ── Admin — static routes registered before ":code" ──

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("export")
  async export(@Query() query: DsaListQuery, @Res() res: Response) {
    const rows = await this.partners.adminExportDsa(query);
    const csv = toCsv(rows, [
      { header: "code", value: (r) => r.code },
      { header: "createdAt", value: (r) => r.createdAt },
      { header: "name", value: (r) => r.name },
      { header: "phone", value: (r) => r.phone },
      { header: "customersCount", value: (r) => r.customersCount },
      { header: "staff", value: (r) => r.staff?.name ?? "" },
      { header: "blocked", value: (r) => r.blocked },
    ]);
    res
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", 'attachment; filename="dsas.csv"')
      .send(csv);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get()
  list(@Query() query: DsaListQuery) {
    return this.partners.adminListDsa(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post()
  onboard(@Body() dto: OnboardPartnerDto) {
    return this.partners.onboard(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch(":code")
  setBlocked(
    @Param("code") code: string,
    @Body() dto: SetBlockedDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.partners.setBlocked(code, dto.blocked, actor);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch(":code/staff")
  setStaff(@Param("code") code: string, @Body() dto: SetStaffDto) {
    return this.partners.setStaff(code, dto.staffId);
  }
}
