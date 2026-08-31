import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CatalogueService } from "./catalogue.service";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

@ApiTags("catalogue")
@ApiBearerAuth()
@Controller("catalogue")
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  /** Any authenticated role — active products only (FRS §2.2 "View"). */
  @Get("products")
  list() {
    return this.catalogue.listActive();
  }

  @Get("products/:id")
  get(@Param("id") id: string) {
    return this.catalogue.get(id);
  }

  // ── Admin only — "Manage" (FRS §2.2 / §7.5) ──
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("admin/products")
  listAll() {
    return this.catalogue.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post("admin/products")
  create(@Body() dto: CreateProductDto) {
    return this.catalogue.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch("admin/products/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.catalogue.update(id, dto, actor);
  }
}
