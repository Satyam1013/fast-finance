import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import {
  DocumentEntity,
  DocumentEntitySchema,
} from "./schemas/document.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
    ]),
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService, MongooseModule],
})
export class DocumentsModule {}
