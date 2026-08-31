import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsMongoId } from "class-validator";
import { AdminService } from "./admin.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

class ReassignDto {
  @IsMongoId() toStaffId!: string;
}

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /** FR-ADM-01/02 — dashboard. */
  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  /** FR-ADM-07 — reassign an application to another staff member. */
  @Post("applications/:id/reassign")
  reassign(
    @Param("id") id: string,
    @Body() dto: ReassignDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.admin.reassign(id, dto.toStaffId, actor);
  }
}
