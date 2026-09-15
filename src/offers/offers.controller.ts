import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OffersService } from "./offers.service";
import { SetOfferDto } from "./dto/set-offer.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

@ApiTags("offers")
@ApiBearerAuth()
@Controller("applications/:id/offer")
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  /** Loan Offer step — any scoped role. */
  @Get()
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.offers.getForCaller(id, user);
  }

  /** Staff (assigned) / Partner (referring) / Admin set or amend the offer. */
  @UseGuards(RolesGuard)
  @Roles(Role.Staff, Role.Partner, Role.Admin)
  @Post()
  set(
    @Param("id") id: string,
    @Body() dto: SetOfferDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.offers.set(id, dto, actor);
  }
}
