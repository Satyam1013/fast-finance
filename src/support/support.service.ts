import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import { Faq, FaqDocument } from "./schemas/faq.schema";
import {
  SupportTicket,
  SupportTicketDocument,
} from "./schemas/support-ticket.schema";
import { CreateFaqDto, UpdateFaqDto } from "./dto/faq.dto";
import { Role } from "../common/constants";
import { toIdString } from "../common/util/id";
import type { AuthUser } from "../common/interfaces/authenticated-request";

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Faq.name) private readonly faqs: Model<FaqDocument>,
    @InjectModel(SupportTicket.name)
    private readonly tickets: Model<SupportTicketDocument>,
    private readonly config: ConfigService,
  ) {}

  /** Support screen payload — contact block + grouped FAQs. */
  async overview() {
    return {
      success: true,
      contact: this.contact(),
      faqs: await this.listActive(),
    };
  }

  contact() {
    return {
      phone: this.config.get<string>("SUPPORT_PHONE", ""),
      whatsapp: this.config.get<string>("SUPPORT_WHATSAPP", ""),
      email: this.config.get<string>("SUPPORT_EMAIL", ""),
      responseTimeLabel: this.config.get<string>(
        "SUPPORT_RESPONSE_LABEL",
        "Our team responds within 5 minutes",
      ),
    };
  }

  async listActive(category?: string) {
    const q: Record<string, unknown> = { active: true };
    if (category) q.category = category;
    const rows = await this.faqs
      .find(q)
      .sort({ order: 1, createdAt: 1 })
      .lean();
    return rows.map((f) => ({
      id: String(f._id),
      question: f.question,
      answer: f.answer,
      category: f.category,
    }));
  }

  listAll() {
    return this.faqs.find().sort({ category: 1, order: 1 }).lean();
  }

  create(dto: CreateFaqDto) {
    return this.faqs.create(dto);
  }

  async update(id: string, dto: UpdateFaqDto) {
    const f = await this.faqs.findByIdAndUpdate(id, dto, { new: true });
    if (!f) throw new NotFoundException("FAQ not found");
    return f;
  }

  async remove(id: string) {
    const res = await this.faqs.deleteOne({ _id: id });
    if (!res.deletedCount) throw new NotFoundException("FAQ not found");
    return { success: true };
  }

  // ── Support tickets — admin panel Support tab ──

  async createTicket(actor: AuthUser, issue: string) {
    // Route is guarded to Customer/Partner only — narrow past AuthUser's
    // wider `role: Role` for the schema's enum.
    const role = actor.role as Role.Customer | Role.Partner;
    const ticket = await this.tickets.create({
      raisedBy: actor.sub,
      role,
      name: actor.name ?? "",
      issue,
    });
    return { success: true, id: ticket.id };
  }

  async adminListTickets(resolved?: string) {
    const q: Record<string, unknown> = {};
    if (resolved !== undefined) q.resolved = resolved === "true";
    const rows = await this.tickets.find(q).sort({ createdAt: -1 }).lean();
    return {
      results: rows.map((t) => ({
        id: toIdString(t._id),
        createdAt: t.createdAt,
        name: t.name,
        role: t.role,
        issue: t.issue,
        resolved: t.resolved,
      })),
    };
  }

  async resolveTicket(id: string, resolved: boolean, actor: AuthUser) {
    const t = await this.tickets.findByIdAndUpdate(
      id,
      resolved
        ? { resolved: true, resolvedAt: new Date(), resolvedBy: actor.sub }
        : { resolved: false, $unset: { resolvedAt: "", resolvedBy: "" } },
      { new: true },
    );
    if (!t) throw new NotFoundException("Support ticket not found");
    return { success: true };
  }
}
