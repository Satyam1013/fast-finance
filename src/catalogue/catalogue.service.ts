import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Product, ProductDocument } from "./schemas/product.schema";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../common/constants";
import type { AuthUser } from "../common/interfaces/authenticated-request";

@Injectable()
export class CatalogueService {
  constructor(
    @InjectModel(Product.name)
    private readonly products: Model<ProductDocument>,
    private readonly audit: AuditService,
  ) {}

  /** Customer/Partner/Staff view — active products only (FR-ADM-22). */
  listActive() {
    return this.products.find({ active: true }).sort({ name: 1 }).lean();
  }

  /** Admin view — everything, including deactivated (FR-ADM-19). */
  listAll() {
    return this.products.find().sort({ name: 1 }).lean();
  }

  async get(id: string) {
    const product = await this.products.findById(id).lean();
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  create(dto: CreateProductDto) {
    return this.products.create(dto);
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
}
