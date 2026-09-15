import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { Customer, CustomerSchema } from "./schemas/customer.schema";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}
