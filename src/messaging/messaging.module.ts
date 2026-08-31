import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MessagingService } from "./messaging.service";
import { MessagingController } from "./messaging.controller";
import { ChatMessage, ChatMessageSchema } from "./schemas/chat-message.schema";
import {
  Application,
  ApplicationSchema,
} from "../applications/schemas/application.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      // Read-only access for thread scoping — same model, no module cycle.
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  providers: [MessagingService],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
