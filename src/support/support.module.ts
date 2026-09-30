import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { SupportService } from "./support.service";
import { SupportController } from "./support.controller";
import { Faq, FaqSchema } from "./schemas/faq.schema";
import {
  SupportTicket,
  SupportTicketSchema,
} from "./schemas/support-ticket.schema";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Faq.name, schema: FaqSchema },
      { name: SupportTicket.name, schema: SupportTicketSchema },
    ]),
  ],
  providers: [SupportService],
  controllers: [SupportController],
})
export class SupportModule {}
