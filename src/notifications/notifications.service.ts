import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from "./schemas/notification.schema";
import { EventsService, DomainEvent } from "../events/events.service";
import { Role } from "../common/constants";
import { asString } from "../common/util/id";
import type { AuthUser } from "../common/interfaces/authenticated-request";

interface CreateNotification {
  userId: string;
  role?: Role;
  type?: NotificationType;
  title: string;
  body: string;
  applicationId?: string;
}

/**
 * Notification centre — M-04 / FR-CUS-24. Fans domain events out to per-user
 * rows so the mobile Notifications screen has something to pull. Publishing
 * stays "publish once" in the emitting service (FRS §10.1); this is a consumer.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notifications: Model<NotificationDocument>,
    private readonly events: EventsService,
  ) {}

  onModuleInit() {
    this.events.stream().subscribe((e) => {
      this.fromEvent(e).catch((err: unknown) =>
        this.logger.error(`notification fan-out failed: ${String(err)}`),
      );
    });
  }

  async create(input: CreateNotification) {
    return this.notifications.create({
      userId: input.userId,
      role: input.role ?? Role.Customer,
      type: input.type ?? NotificationType.General,
      title: input.title,
      body: input.body,
      applicationId: input.applicationId,
    });
  }

  /** New customer just signed up — Notifications screen "Welcome to Fast Finance!". */
  welcome(customerId: string) {
    return this.create({
      userId: customerId,
      type: NotificationType.Welcome,
      title: "Welcome to Fast Finance!",
      body: "We'll help you make your loan process easier.",
    });
  }

  async list(user: AuthUser) {
    const rows = await this.notifications
      .find({ userId: user.sub, deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return {
      success: true,
      unreadCount: rows.filter((n) => !n.read).length,
      notifications: rows.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        body: n.body,
        applicationId: n.applicationId ?? null,
        read: n.read,
        createdAt: n.createdAt,
      })),
    };
  }

  async markRead(id: string, user: AuthUser) {
    const res = await this.notifications.updateOne(
      { _id: id, userId: user.sub },
      { read: true },
    );
    if (!res.matchedCount)
      throw new NotFoundException("Notification not found");
    return { success: true };
  }

  async markAllRead(user: AuthUser) {
    await this.notifications.updateMany(
      { userId: user.sub, read: false },
      { read: true },
    );
    return { success: true };
  }

  /** Swipe-to-delete — soft delete so it can be recovered server-side. */
  async remove(id: string, user: AuthUser) {
    const res = await this.notifications.updateOne(
      { _id: id, userId: user.sub },
      { deletedAt: new Date() },
    );
    if (!res.matchedCount)
      throw new NotFoundException("Notification not found");
    return { success: true };
  }

  private async fromEvent(e: DomainEvent): Promise<void> {
    if (!e.customerId) return;
    if (e.type === "stage.changed") {
      await this.create({
        userId: e.customerId,
        type: NotificationType.StageUpdate,
        title: asString(e.payload.stageLabel, "Application update"),
        body: asString(e.payload.message),
        applicationId: e.applicationId,
      });
    } else if (e.type === "application.rejected") {
      const product = asString(e.payload.productName, "loan");
      const reason = asString(e.payload.reason);
      await this.create({
        userId: e.customerId,
        type: NotificationType.ApplicationRejected,
        title: "Application not approved",
        body: `Your ${product} application was not approved. Reason: ${reason}`,
        applicationId: e.applicationId,
      });
    }
  }
}
