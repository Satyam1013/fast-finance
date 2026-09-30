import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CatalogueService } from "./catalogue.service";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";
import { uploadOptions } from "../common/util/upload";

class ProductListQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() active?: string;
}

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
  // Note: the admin panel's `GET /products?search=&active=` collides with the
  // customer-facing route above, so admin CRUD lives under /admin/products
  // (search/active filters added here, not on the bare path).
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get("admin/products")
  listAll(@Query() query: ProductListQuery) {
    return this.catalogue.listAll(query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post("admin/products")
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(FileInterceptor("image", uploadOptions))
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.catalogue.create(
      dto,
      image
        ? {
            buffer: image.buffer,
            mimetype: image.mimetype,
            size: image.size,
            originalname: image.originalname,
          }
        : undefined,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch("admin/products/:id")
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(FileInterceptor("image", uploadOptions))
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: AuthUser,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.catalogue.update(
      id,
      dto,
      actor,
      image
        ? {
            buffer: image.buffer,
            mimetype: image.mimetype,
            size: image.size,
            originalname: image.originalname,
          }
        : undefined,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete("admin/products/:id")
  remove(@Param("id") id: string) {
    return this.catalogue.remove(id);
  }
}
