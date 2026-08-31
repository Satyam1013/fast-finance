import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { StaffService } from "./staff.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role, StaffRole } from "../common/constants";

class CreateStaffDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() phone!: string;
  @MinLength(8) password!: string;
  @IsEnum(StaffRole) staffRole!: StaffRole;
}

@ApiTags("staff")
@ApiBearerAuth()
@Controller("staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  /** Staff's own profile — FR-STF-15. */
  @UseGuards(RolesGuard)
  @Roles(Role.Staff, Role.Admin)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.staff.findById(user.sub);
  }

  // ── Admin — staff management (FRS §7.3) ──
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get()
  list() {
    return this.staff.list();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staff.create(dto);
  }
}
