import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { DocumentsService } from "./documents.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { DocumentType, Role } from "../common/constants";
import {
  uploadOptions,
  type UploadedFile as Upload,
} from "../common/util/upload";

class UploadDocumentDto {
  @IsEnum(DocumentType) type!: DocumentType;
}
class ManualBankDto {
  @IsString() accountNumber!: string;
  @IsString() reEnteredAccountNumber!: string;
  @IsString() ifsc!: string;
}
class ReviewDto {
  @IsIn(["verify", "reject"]) decision!: "verify" | "reject";
  @IsOptional() @IsString() note?: string;
}

@ApiTags("documents")
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /** FR-CUS-09 — checklist for an application. */
  @Get("applications/:id/documents")
  checklist(@Param("id") id: string) {
    return this.documents.checklistView(id);
  }

  /** FR-CUS-10 — upload one checklist document (PAN/Aadhaar/Selfie/Address/Salary). */
  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Post("applications/:id/documents")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  upload(
    @Param("id") id: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const upload: Upload | undefined = file
      ? {
          buffer: file.buffer,
          mimetype: file.mimetype,
          size: file.size,
          originalname: file.originalname,
        }
      : undefined;
    return this.documents.upload(id, dto.type, upload);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Post("applications/:id/documents/bank/manual")
  manualBank(@Param("id") id: string, @Body() dto: ManualBankDto) {
    return this.documents.submitManualBank(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Customer)
  @Post("applications/:id/documents/bank/aa")
  startAa(@Param("id") id: string) {
    return this.documents.startAaFlow(id);
  }

  /** FR-STF-08 — verify / reject a document. */
  @UseGuards(RolesGuard)
  @Roles(Role.Staff, Role.Admin)
  @Post("documents/:docId/review")
  review(
    @Param("docId") docId: string,
    @Body() dto: ReviewDto,
    @CurrentUser() staff: AuthUser,
  ) {
    return this.documents.review(docId, dto.decision, dto.note, staff);
  }
}
