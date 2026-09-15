import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import {
  DocumentEntity,
  DocumentEntitySchema,
} from "./schemas/document.schema";
import {
  Application,
  ApplicationSchema,
} from "../applications/schemas/application.schema";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
      // Read-only access for the per-category checklist — same model as
      // ApplicationsModule, no module cycle (mirrors MessagingModule).
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService, MongooseModule],
})
export class DocumentsModule {}
