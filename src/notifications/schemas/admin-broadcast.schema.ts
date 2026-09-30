import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AdminBroadcastDocument = HydratedDocument<AdminBroadcast> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * A record of one admin-authored broadcast (`POST /admin/notifications`) —
 * distinct from {@link Notification}, which is the per-recipient fan-out row
 * this creates one of for every customer. This is what the admin panel's
 * `GET /admin/notifications` lists back.
 */
@Schema({ timestamps: true, collection: "admin_broadcasts" })
export class AdminBroadcast {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true })
  sentCount!: number;
}

export const AdminBroadcastSchema =
  SchemaFactory.createForClass(AdminBroadcast);
