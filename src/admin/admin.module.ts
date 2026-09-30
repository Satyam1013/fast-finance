import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationsModule } from "../applications/applications.module";
import { CustomersModule } from "../customers/customers.module";
import { StaffModule } from "../staff/staff.module";
import { PartnersModule } from "../partners/partners.module";
import { DocumentsModule } from "../documents/documents.module";
import { Banner, BannerSchema } from "../content/schemas/banner.schema";
import { AdminService } from "./admin.service";
import { AdminController, DashboardController } from "./admin.controller";
import { AdminCustomersService } from "./admin-customers.service";
import { AdminCustomersController } from "./admin-customers.controller";

@Module({
  imports: [
    ApplicationsModule,
    CustomersModule,
    StaffModule,
    PartnersModule,
    DocumentsModule,
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
  ],
  providers: [AdminService, AdminCustomersService],
  controllers: [AdminController, DashboardController, AdminCustomersController],
})
export class AdminModule {}
