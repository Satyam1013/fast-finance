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
import { SupportService } from "./support.service";
import { CreateFaqDto, UpdateFaqDto } from "./dto/faq.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";

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
