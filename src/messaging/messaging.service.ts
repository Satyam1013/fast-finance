import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ChatMessage,
  ChatMessageDocument,
  MessageKind,
  MessageSender,
} from "./schemas/chat-message.schema";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import { EventsService } from "../events/events.service";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { Role } from "../common/constants";

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messages: Model<ChatMessageDocument>,
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    private readonly events: EventsService,
  ) {}

  /** FR-CUS-21 / FR-STF-12 — the shared thread for an application, scoped. */
  async thread(applicationId: string, user: AuthUser) {
    const app = await this.applications.findById(applicationId).lean();
    if (!app || !this.canAccess(app, user)) {
      throw new NotFoundException("Application not found");
    }

    const rows = await this.messages
      .find({ applicationId })
      .sort({ createdAt: 1 })
      .lean();

    await this.markRead(applicationId, user.role);

    return {
      success: true,
      messages: rows.map((m) => ({
        id: String(m._id),
        kind: m.kind,
        sender: m.sender,
        body: m.body,
        mine:
          (user.role === Role.Customer &&
            m.sender === MessageSender.Customer) ||
          ((user.role === Role.Staff || user.role === Role.Admin) &&
            m.sender === MessageSender.Staff),
        createdAt: m.createdAt,
      })),
    };
  }

  /** Unread count for the caller — badge on the chat / support tab. */
  async unreadCount(applicationId: string, role: Role): Promise<number> {
    const field = role === Role.Customer ? "readByCustomer" : "readByStaff";
    const senderToIgnore =
      role === Role.Customer ? MessageSender.Customer : MessageSender.Staff;
    return this.messages.countDocuments({
      applicationId,
      [field]: false,
      sender: { $ne: senderToIgnore },
    });
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
  async postUser(applicationId: string, body: string, user: AuthUser) {
    const app = await this.applications.findById(applicationId).lean();
    if (!app || !this.canAccess(app, user)) {
      throw new NotFoundException("Application not found");
    }
    if (app.isRejected || app.locked) {
      throw new ForbiddenException(
        "This application is closed. Messaging is disabled.",
      );
    }

    const sender =
      user.role === Role.Customer
        ? MessageSender.Customer
        : MessageSender.Staff;

    const msg = await this.messages.create({
      applicationId,
      kind: MessageKind.User,
      sender,
      senderId: user.sub,
      body: body.trim(),
      readByCustomer: sender === MessageSender.Customer,
      readByStaff: sender === MessageSender.Staff,
    });

    const audience = [app.customerId, app.staffId];
    if (app.partnerId) audience.push(app.partnerId);
    this.events.publish({
      audience,
      type: "message.created",
      applicationId,
      payload: { id: msg.id, kind: MessageKind.User, sender, body: msg.body },
    });

    return {
      success: true,
      message: {
        id: msg.id,
        kind: msg.kind,
        sender: msg.sender,
        body: msg.body,
        mine: true,
        createdAt: (msg as ChatMessageDocument & { createdAt: Date }).createdAt,
      },
    };
  }

  private canAccess(
    app: Pick<Application, "customerId" | "staffId" | "partnerId">,
    user: AuthUser,
  ): boolean {
    switch (user.role) {
      case Role.Customer:
        return app.customerId === user.sub;
      case Role.Staff:
        return app.staffId === user.sub;
      case Role.Partner:
        return app.partnerId === user.sub;
      case Role.Admin:
        return true;
      default:
        return false;
    }
  }

  private markRead(applicationId: string, role: Role) {
    if (role === Role.Partner) return Promise.resolve();
    const field = role === Role.Customer ? "readByCustomer" : "readByStaff";
    return this.messages.updateMany(
      { applicationId, [field]: false },
      { [field]: true },
    );
  }
}
