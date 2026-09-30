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
import { Matches } from "class-validator";
import { ContentService } from "./content.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";
import {
  CreateBannerDto,
  CreateGalleryItemDto,
  CreateLenderDto,
  SetBannerStatusDto,
} from "./dto/content.dto";

class PincodeQuery {
  @Matches(/^\d{6}$/, { message: "pincode must be 6 digits" })
  pincode!: string;
}

@ApiTags("content")
@ApiBearerAuth()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // ── Home screen ──

  /** FR-CUS-06 — promotional banners. */
  @Get("content/banners")
  banners() {
    return this.content.activeBanners();
  }

  @Get("content/gallery")
  gallery() {
    return this.content.activeGallery();
  }

  /** "Our Partnered NBFCs". */
  @Get("content/lenders")
  lenders() {
    return this.content.activeLenders();
  }

  /** FR-CUS-05 — nearby partner banks/NBFCs for a pincode. */
  @Get("content/lenders/search")
  lenderSearch(@Query() q: PincodeQuery) {
    return this.content.lendersByPincode(q.pincode);
  }

  // ── Admin CRUD ──
  // "app-banners" is the admin panel's expected bare path — no collision,
  // since only /content/banners (customer, active-only) existed before.

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get(["admin/content/banners", "app-banners"])
  listBanners() {
    return this.content.adminListBanners();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post(["admin/content/banners", "app-banners"])
  createBanner(@Body() dto: CreateBannerDto) {
    return this.content.createBanner(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch(["admin/content/banners/:id", "app-banners/:id"])
  setBannerStatus(@Param("id") id: string, @Body() dto: SetBannerStatusDto) {
    return this.content.setBannerStatus(id, dto.status ?? dto.active ?? true);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete(["admin/content/banners/:id", "app-banners/:id"])
  removeBanner(@Param("id") id: string) {
    return this.content.removeBanner(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post("admin/content/gallery")
  createGalleryItem(@Body() dto: CreateGalleryItemDto) {
    return this.content.createGalleryItem(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete("admin/content/gallery/:id")
  removeGalleryItem(@Param("id") id: string) {
    return this.content.removeGalleryItem(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post("admin/content/lenders")
  createLender(@Body() dto: CreateLenderDto) {
    return this.content.createLender(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete("admin/content/lenders/:id")
  removeLender(@Param("id") id: string) {
    return this.content.removeLender(id);
  }
}
