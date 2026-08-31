import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CommissionService } from "./commission.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Role } from "../common/constants";

@ApiTags("commission")
@ApiBearerAuth()
@Controller("commission")
export class CommissionController {
  constructor(private readonly commission: CommissionService) {}

  /** FR-PTR-21/23 — the partner's own earnings. */
  @UseGuards(RolesGuard)
  @Roles(Role.Partner)
  @Get("me")
  mine(@CurrentUser("sub") partnerId: string) {
    return this.commission.earningsForPartner(partnerId);
  }
}
