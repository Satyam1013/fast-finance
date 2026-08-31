import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ChatMessageDocument = HydratedDocument<ChatMessage> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum MessageKind {
  /** Written by customer or assigned staff — FR-CUS-21 / FR-STF-12. */
  User = "USER",
  /** Auto-generated on each stage change — FR-STF-11, part of the stage txn. */
  System = "SYSTEM",
}

export enum MessageSender {
  Customer = "CUSTOMER",
  Staff = "STAFF",
  System = "SYSTEM",
}

/**
 * One shared thread per application. The stage-change transaction writes a
 * SYSTEM message here so Customer, Partner and Admin all see the same update
 * without independent polling (FRS §10.1 stage-change side effects).
 */
@Schema({ timestamps: true, collection: "chat_messages" })
export class ChatMessage {
  @Prop({ required: true, index: true })
  applicationId!: string;

  @Prop({ type: String, enum: MessageKind, default: MessageKind.User })
  kind!: MessageKind;

  @Prop({ type: String, enum: MessageSender, required: true })
  sender!: MessageSender;

  /** _id of the customer or staff author; unset for SYSTEM. */
  @Prop()
  senderId?: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ default: false })
  readByCustomer!: boolean;

  @Prop({ default: false })
  readByStaff!: boolean;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
