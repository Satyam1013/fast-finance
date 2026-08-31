import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import { Faq, FaqDocument } from "./schemas/faq.schema";
import { CreateFaqDto, UpdateFaqDto } from "./dto/faq.dto";

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Faq.name) private readonly faqs: Model<FaqDocument>,
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
}
