import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import { CustomersModule } from "../customers/customers.module";
import { StaffModule } from "../staff/staff.module";
import { PartnersModule } from "../partners/partners.module";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";

@Module({
  imports: [ApplicationsModule, CustomersModule, StaffModule, PartnersModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
