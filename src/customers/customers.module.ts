import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { Customer, CustomerSchema } from "./schemas/customer.schema";
import {
  RefreshToken,
  RefreshTokenSchema,
} from "../auth/schemas/refresh-token.schema";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      // Read/write — same model as AuthModule; kills a blocked customer's
      // sessions immediately (resolveSubject already re-checks `blocked` on
      // every request, so this is belt-and-braces, not the primary control).
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}
