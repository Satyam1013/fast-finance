import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { DsaContentService } from "./dsa-content.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";
import { DsaResourceType } from "./schemas/dsa-resource.schema";
import { uploadOptions } from "../common/util/upload";
import type { UploadedFile as StoredUploadedFile } from "../common/util/upload";

class CreateResourceDto {
  @IsEnum(DsaResourceType) type!: DsaResourceType;
  @IsString() title!: string;
  @IsOptional() @IsString() link?: string;
}

class CreateCibilLinkDto {
  @IsString() source!: string;
  @IsString() link!: string;
}

class CreateCommissionFileDto {
  @IsString() name!: string;
}

class CreateBankingLinkDto {
  @IsString() bank!: string;
  @IsString() link!: string;
  @IsOptional() @IsString() rate?: string;
  @IsOptional() @IsString() accId?: string;
  @IsOptional() @IsString() password?: string;
}

/**
 * DSA portal content library — global lists Admin curates for every DSA
 * (Partner) to read, distinct from the DSA *record* CRUD in PartnersModule
 * (`/dsas`). Path is singular ("dsa") to match the frontend spec.
 */
@ApiTags("dsa")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("dsa")
export class DsaContentController {
  constructor(private readonly dsa: DsaContentService) {}

  @Roles(Role.Admin)
  @Get("stats")
  stats() {
    return this.dsa.stats();
  }

  // ── Learning resources ──

  @Roles(Role.Admin, Role.Partner)
  @Get("resources")
  listResources() {
    return this.dsa.listResources();
  }

  @Roles(Role.Admin)
  @Post("resources")
  @ApiConsumes("multipart/form-data", "application/json")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  createResource(
    @Body() dto: CreateResourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const stored: StoredUploadedFile | undefined = file
      ? {
          buffer: file.buffer,
          mimetype: file.mimetype,
          size: file.size,
          originalname: file.originalname,
        }
      : undefined;
    return this.dsa.createResource(dto, stored);
  }

  @Roles(Role.Admin)
  @Delete("resources/:id")
  removeResource(@Param("id") id: string) {
    return this.dsa.removeResource(id);
  }

  // ── CIBIL links ──

  @Roles(Role.Admin, Role.Partner)
  @Get("cibil-links")
  listCibilLinks() {
    return this.dsa.listCibilLinks();
  }

  @Roles(Role.Admin)
  @Post("cibil-links")
  createCibilLink(@Body() dto: CreateCibilLinkDto) {
    return this.dsa.createCibilLink(dto);
  }

  @Roles(Role.Admin)
  @Delete("cibil-links/:id")
  removeCibilLink(@Param("id") id: string) {
    return this.dsa.removeCibilLink(id);
  }

  // ── Commission chart files ──

  @Roles(Role.Admin, Role.Partner)
  @Get("commission-files")
  listCommissionFiles() {
    return this.dsa.listCommissionFiles();
  }

  @Roles(Role.Admin)
  @Post("commission-files")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  createCommissionFile(
    @Body() dto: CreateCommissionFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.dsa.createCommissionFile(dto.name, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.originalname,
    });
  }

  @Roles(Role.Admin)
  @Delete("commission-files/:id")
  removeCommissionFile(@Param("id") id: string) {
    return this.dsa.removeCommissionFile(id);
  }

  @Roles(Role.Admin, Role.Partner)
  @Get("commission-files/:id/preview")
  previewCommissionFile(@Param("id") id: string) {
    return this.dsa.previewCommissionFile(id);
  }

  // ── Banking links ──

  @Roles(Role.Admin, Role.Partner)
  @Get("banking-links")
  listBankingLinks() {
    return this.dsa.listBankingLinks();
  }

  @Roles(Role.Admin)
  @Post("banking-links")
  createBankingLink(@Body() dto: CreateBankingLinkDto) {
    return this.dsa.createBankingLink(dto);
  }

  @Roles(Role.Admin)
  @Delete("banking-links/:id")
  removeBankingLink(@Param("id") id: string) {
    return this.dsa.removeBankingLink(id);
  }
}
