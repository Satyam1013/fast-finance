import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { Application, ApplicationSchema } from "./schemas/application.schema";
import { AuditModule } from "../audit/audit.module";
import { CatalogueModule } from "../catalogue/catalogue.module";
import { DocumentsModule } from "../documents/documents.module";
import { MessagingModule } from "../messaging/messaging.module";
import { CustomersModule } from "../customers/customers.module";
import { StaffModule } from "../staff/staff.module";
import { OffersModule } from "../offers/offers.module";

@Module({
  imports: [
    AuditModule,
    CatalogueModule,
    DocumentsModule,
    MessagingModule,
    CustomersModule,
    StaffModule,
    OffersModule,
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService, MongooseModule],
})
export class ApplicationsModule {}
