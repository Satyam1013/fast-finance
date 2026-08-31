import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { Application, ApplicationSchema } from "./schemas/application.schema";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService, MongooseModule],
})
export class ApplicationsModule {}
