import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Role } from "../../common/constants";

export type NotificationDocument = HydratedDocument<Notification> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum NotificationType {
  Welcome = "WELCOME",
  StageUpdate = "STAGE_UPDATE",
  DocumentRequest = "DOCUMENT_REQUEST",
  ApplicationRejected = "APPLICATION_REJECTED",
  General = "GENERAL",
}

/**
 * In-app notification — M-04 / FR-CUS-24. One row per recipient. Delivery is
 * pull (GET /notifications) + the SSE stream; push (FCM/APNs) is a later add.
 * Deletes are soft (`deletedAt`) so "swipe to delete" is reversible server-side.
 */
@Schema({ timestamps: true, collection: "notifications" })
export class Notification {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ type: String, enum: Role, required: true })
  role!: Role;

  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.General,
  })
  type!: NotificationType;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  /** Deep-link target — the application this notification is about. */
  @Prop({ index: true })
  applicationId?: string;

  @Prop({ default: false, index: true })
  read!: boolean;

  @Prop()
  deletedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
