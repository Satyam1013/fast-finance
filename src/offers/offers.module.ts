import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OffersService } from "./offers.service";
import { OffersController } from "./offers.controller";
import { LoanOffer, LoanOfferSchema } from "./schemas/loan-offer.schema";
import {
  Application,
  ApplicationSchema,
} from "../applications/schemas/application.schema";
import { AuditModule } from "../audit/audit.module";
import { MessagingModule } from "../messaging/messaging.module";

@Module({
  imports: [
    AuditModule,
    MessagingModule,
    MongooseModule.forFeature([
      { name: LoanOffer.name, schema: LoanOfferSchema },
      // Read-only access for scoping — same model, no module cycle.
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  providers: [OffersService],
  controllers: [OffersController],
  exports: [OffersService],
})
export class OffersModule {}
