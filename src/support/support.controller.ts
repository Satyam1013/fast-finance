import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsString, MinLength } from "class-validator";
import { SupportService } from "./support.service";
import { CreateFaqDto, UpdateFaqDto } from "./dto/faq.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

class CreateTicketDto {
  @IsString() @MinLength(3) issue!: string;
}

class ResolveTicketDto {
  @IsBoolean() resolved!: boolean;
}

@ApiTags("support")
@ApiBearerAuth()
@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  /** FR-CUS-22 — Support screen: contact block + FAQs. */
  @Get("support")
  overview() {
    return this.support.overview();
  }

  @Get("support/faqs")
  faqs(@Query("category") category?: string) {
    return this.support.listActive(category);
  }

  /**
   * FR-CUS-22-adjacent — raise a support ticket (Customer/DSA). Bare
   * `GET /support?resolved=` collides with the Support screen above, so the
   * admin panel's ticket list/resolve stay under `/admin/support/tickets`.
   */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer, Role.Partner)
  @Post("support/tickets")
  createTicket(@CurrentUser() actor: AuthUser, @Body() dto: CreateTicketDto) {
    return this.support.createTicket(actor, dto.issue);
  }

  // ── Admin — support tickets ──
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("admin/support/tickets")
  listTickets(@Query("resolved") resolved?: string) {
    return this.support.adminListTickets(resolved);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch("admin/support/tickets/:id")
  resolveTicket(
    @Param("id") id: string,
    @Body() dto: ResolveTicketDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.support.resolveTicket(id, dto.resolved, actor);
  }

  // ── Admin — FAQ management ──
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("admin/support/faqs")
  listAll() {
    return this.support.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post("admin/support/faqs")
  create(@Body() dto: CreateFaqDto) {
    return this.support.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch("admin/support/faqs/:id")
  update(@Param("id") id: string, @Body() dto: UpdateFaqDto) {
    return this.support.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete("admin/support/faqs/:id")
  remove(@Param("id") id: string) {
    return this.support.remove(id);
  }
}
