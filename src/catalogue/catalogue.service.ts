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
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../common/constants";
import { StorageService } from "../storage/storage.service";
import { toIdString } from "../common/util/id";
import type { AuthUser } from "../common/interfaces/authenticated-request";

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
  listAll() {
    return this.products.find().sort({ name: 1 }).lean();
  }

  async get(id: string) {
    const product = await this.products.findById(id).lean();
    if (!product) throw new NotFoundException("Product not found");
    return this.present(product);
  }

  async create(dto: CreateProductDto) {
    const code = (dto.code ?? deriveProductCode(dto.name)).toUpperCase();
    if (await this.products.exists({ code })) {
      throw new BadRequestException({
        success: false,
        code: "PRODUCT_CODE_TAKEN",
        message: `Product code "${code}" is already in use.`,
      });
    }
    return this.products.create({
      ...dto,
      code,
      kind: dto.kind ?? ProductKind.Loan,
    });
  }

  async update(id: string, dto: UpdateProductDto, actor: AuthUser) {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundException("Product not found");

    const wasActive = product.active;
    Object.assign(product, dto);
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
    return product;
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
