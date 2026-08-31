import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { DocumentsService } from "./documents.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

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
    return this.documents.checklist(id);
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
