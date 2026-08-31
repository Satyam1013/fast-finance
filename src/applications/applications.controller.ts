import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsMongoId, IsString, MinLength } from "class-validator";
import { ApplicationsService } from "./applications.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

class StartApplicationDto {
  @IsMongoId() productId!: string;
}
class RejectDto {
  @IsString() @MinLength(3) reason!: string;
}

@ApiTags("applications")
@ApiBearerAuth()
@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  /** FR-CUS-15/18 — caller's applications, scoped by role. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.applications.listForCaller(user);
  }

  /** FR-CUS-15/16/20 — one application with the 7-stage tracker, scoped by role. */
  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.applications.getForCaller(id, user);
  }

  /** FR-CUS-03/04 — start (or resume) an application for a product. */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Post()
  start(
    @CurrentUser("sub") customerId: string,
    @Body() dto: StartApplicationDto,
  ) {
    return this.applications.startOrResume(customerId, dto.productId);
  }

  /** FR-CUS-13 — final submission (gated server-side). */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Post(":id/submit")
  submit(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.applications.submit(id, user);
  }

  /** FR-STF-09 — advance one stage (assigned staff or admin). */
  @UseGuards(RolesGuard)
  @Roles(Role.Staff, Role.Admin)
  @Post(":id/advance")
  advance(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.applications.advanceStage(id, user);
  }

  /** PRD A-03 — admin backward correction. */
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post(":id/revert")
  revert(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.applications.revertStage(id, user);
  }

  /** FRS §3.1 — reject from any stage with a reason. */
  @UseGuards(RolesGuard)
  @Roles(Role.Staff, Role.Admin)
  @Post(":id/reject")
  reject(
    @Param("id") id: string,
    @Body() dto: RejectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applications.reject(id, dto.reason, user);
  }
}
