import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ChatMessage,
  ChatMessageDocument,
  MessageKind,
  MessageSender,
} from "./schemas/chat-message.schema";
import { EventsService } from "../events/events.service";

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messages: Model<ChatMessageDocument>,
    private readonly events: EventsService,
  ) {}

  thread(applicationId: string) {
    return this.messages.find({ applicationId }).sort({ createdAt: 1 }).lean();
  }

  /** Called inside the stage transaction — FR-STF-11. */
  async postSystem(applicationId: string, body: string, audience: string[]) {
    const msg = await this.messages.create({
      applicationId,
      kind: MessageKind.System,
      sender: MessageSender.System,
      body,
    });
    this.events.publish({
      audience,
      type: "message.created",
      applicationId,
      payload: { id: msg.id, kind: MessageKind.System, body },
    });
    return msg;
  }

  /** FR-CUS-21 / FR-STF-12 — customer <-> assigned staff chat. */
  postUser(
    _applicationId: string,
    _sender: MessageSender,
    _senderId: string,
    _body: string,
  ): Promise<never> {
    // TODO: authorise sender against the application, persist, fan out.
    throw new NotImplementedException("messaging.postUser — not built");
  }
}
