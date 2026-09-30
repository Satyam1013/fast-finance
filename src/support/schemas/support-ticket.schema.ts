import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Role } from "../../common/constants";

export type SupportTicketDocument = HydratedDocument<SupportTicket> & {
  createdAt: Date;
  updatedAt: Date;
};

/** A Customer/DSA-raised support issue — the admin panel's Support tab. */
@Schema({ timestamps: true, collection: "support_tickets" })
export class SupportTicket {
  @Prop({ required: true, index: true })
  raisedBy!: string;

  @Prop({ type: String, enum: [Role.Customer, Role.Partner], required: true })
  role!: Role.Customer | Role.Partner;

  /** Denormalised at creation — the raiser's name at that time. */
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, trim: true })
  issue!: string;

  @Prop({ default: false, index: true })
  resolved!: boolean;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  resolvedBy?: string;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
