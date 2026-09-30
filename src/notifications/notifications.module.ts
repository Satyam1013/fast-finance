import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NotificationsService } from "./notifications.service";
import {
  NotificationsController,
  AdminNotificationsController,
} from "./notifications.controller";
import {
  Notification,
  NotificationSchema,
} from "./schemas/notification.schema";
import {
  AdminBroadcast,
  AdminBroadcastSchema,
} from "./schemas/admin-broadcast.schema";
import { Customer, CustomerSchema } from "../customers/schemas/customer.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: AdminBroadcast.name, schema: AdminBroadcastSchema },
      // Read-only — used only to fan a broadcast out to every customer id.
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController, AdminNotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
