import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, type Types } from "mongoose";
import {
  Product,
  ProductDocument,
  ProductKind,
} from "./schemas/product.schema";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../common/constants";
import { StorageService } from "../storage/storage.service";
import { toIdString } from "../common/util/id";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import type { UploadedFile } from "../common/util/upload";

/** "PL" from "Personal Loan", "MLAP" from "Mortgage Loan (LAP)". */
export function deriveProductCode(name: string): string {
  const letters = name
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (letters || name.slice(0, 2)).toUpperCase().slice(0, 6);
}

@Injectable()
export class CatalogueService {
  constructor(
    @InjectModel(Product.name)
    private readonly products: Model<ProductDocument>,
    // Read-only — same model as ApplicationsModule, no module cycle (mirrors
    // MessagingModule/DocumentsModule/OffersModule; see CLAUDE.md). Used only
    // to refuse deleting a product that already has applications against it.
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  /** Customer/Partner/Staff view — active products only (FR-ADM-22). */
  async listActive() {
    const rows = await this.products
      .find({ active: true })
      .sort({ kind: 1, name: 1 })
      .lean();
    return rows.map((p) => this.present(p));
  }

  /** Admin view — everything, including deactivated (FR-ADM-19). */
  async listAll(filters: { search?: string; active?: string } = {}) {
    const q: Record<string, unknown> = {};
    if (filters.search) q.name = new RegExp(filters.search.trim(), "i");
    if (filters.active !== undefined) q.active = filters.active === "true";
    const rows = await this.products.find(q).sort({ name: 1 }).lean();
    return rows.map((p) => this.presentAdmin(p));
  }

  async get(id: string) {
    const product = await this.products.findById(id).lean();
    if (!product) throw new NotFoundException("Product not found");
    return this.present(product);
  }

  async create(dto: CreateProductDto, image?: UploadedFile) {
    const code = (dto.code ?? deriveProductCode(dto.name)).toUpperCase();
    if (await this.products.exists({ code })) {
      throw new BadRequestException({
        success: false,
        code: "PRODUCT_CODE_TAKEN",
        message: `Product code "${code}" is already in use.`,
      });
    }
    const imageRef = image
      ? (await this.storage.save("admin/products", image)).key
      : undefined;
    const product = await this.products.create({
      ...dto,
      code,
      kind: dto.kind ?? ProductKind.Loan,
      imageRef,
    });
    return this.presentAdmin(product.toObject());
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    actor: AuthUser,
    image?: UploadedFile,
  ) {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundException("Product not found");

    const wasActive = product.active;
    Object.assign(product, dto);
    if (image) {
      product.imageRef = (await this.storage.save("admin/products", image)).key;
    }
    await product.save();

    if (dto.active !== undefined && dto.active !== wasActive) {
      await this.audit.record({
        action: dto.active
          ? AuditAction.ProductActivated
          : AuditAction.ProductDeactivated,
        targetId: id,
        targetType: "Product",
        actorId: actor.sub,
        actorRole: actor.role,
        actorName: actor.name,
      });
    }
    return this.presentAdmin(product.toObject());
  }

  /**
   * Hard delete — only when nothing references it yet. FR-ADM-21/22 wants
   * deactivation (not deletion) to be the normal way to retire a product, so
   * this is for correcting a mistaken entry, not for retiring a live one.
   */
  async remove(id: string) {
    if (await this.applications.exists({ productId: id })) {
      throw new BadRequestException({
        success: false,
        code: "PRODUCT_IN_USE",
        message:
          "This product has applications against it — deactivate it instead of deleting.",
      });
    }
    const res = await this.products.deleteOne({ _id: id });
    if (!res.deletedCount) throw new NotFoundException("Product not found");
    return { success: true };
  }

  /** Admin panel shape — everything, plus the spec's `type`/`rate` aliases. */
  private presentAdmin(
    p: Product & { _id?: Types.ObjectId | string; createdAt?: Date },
  ) {
    return {
      ...this.present(p),
      type: p.kind,
      rate: `${p.interestRateMin}% - ${p.interestRateMax}%`,
      commissionType: p.commissionType,
      commissionValue: p.commissionValue,
      active: p.active,
      createdAt: p.createdAt ?? null,
    };
  }

  /** Card shape for the Home screen — resolved image URL + rate label. */
  private present(p: Product & { _id?: Types.ObjectId | string }) {
    return {
      id: toIdString(p._id),
      name: p.name,
      code: p.code,
      kind: p.kind,
      subtitle: p.subtitle ?? null,
      imageUrl: this.storage.urlFor(p.imageRef) ?? null,
      interestRateMin: p.interestRateMin,
      interestRateMax: p.interestRateMax,
      rateLabel: `${p.interestRateMin}% - ${p.interestRateMax}% p.a.`,
      processingFee: p.processingFee ?? null,
    };
  }
}
