import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

@ApiTags("customers")
@ApiBearerAuth()
@Controller()
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  /** Customer's own profile — FR-CUS-23. */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Get("me/profile")
  myProfile(@CurrentUser() user: AuthUser) {
    return this.customers.getOwnProfile(user);
  }

  /** Admin register — FR-ADM-04. Staff assigned list lives in staff module. */
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("admin/customers")
  adminList() {
    return this.customers.adminList({});
  }
}
