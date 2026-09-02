import {
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { StorageService } from "./storage.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";
import { uploadOptions } from "../common/util/upload";

/**
 * Serves stored files (KYC scans, profile photos, CMS images) back to an
 * authenticated caller. Global {@link JwtAuthGuard} applies — a valid token is
 * required. Per-record scoping (only the owning customer + assigned staff may
 * read a KYC scan) is a TODO; keys are uuid-based in the meantime.
 */
@ApiTags("files")
@ApiBearerAuth()
@Controller()
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  /** Admin — upload a CMS asset (banner / gallery / lender logo), get its key. */
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post("admin/assets")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  async uploadAsset(@UploadedFile() file: Express.Multer.File | undefined) {
    const saved = await this.storage.save("content", {
      buffer: file!.buffer,
      mimetype: file!.mimetype,
      size: file!.size,
    });
    return { success: true, key: saved.key, url: saved.url };
  }

  @Get("files/*key")
  async get(@Param("key") key: string | string[]): Promise<StreamableFile> {
    const path = Array.isArray(key) ? key.join("/") : key;
    return new StreamableFile(await this.storage.stream(path));
  }
}
