import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PartnersService } from "./partners.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

class OnboardPartnerDto {
  @IsString() name!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() city?: string;
}

@ApiTags("partners")
@ApiBearerAuth()
@Controller("partners")
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

  // ── Admin ──
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get()
  list() {
    return this.partners.adminList();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post()
  onboard(@Body() dto: OnboardPartnerDto) {
    return this.partners.onboard(dto);
  }
}
