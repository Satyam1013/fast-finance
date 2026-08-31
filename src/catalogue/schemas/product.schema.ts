import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ProductDocument = HydratedDocument<Product> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum CommissionType {
  Percentage = "PERCENTAGE", // of loan amount
  Flat = "FLAT", // fixed rupee value per disbursal
}

export enum ProductKind {
  Loan = "LOAN",
  Insurance = "INSURANCE",
}

/**
 * Product / Service — FRS §9.6. Personal / Business / Home / Car / Mortgage
 * loan, or Insurance (Life / Health / Vehicle). Deactivating hides it from
 * customers and blocks new applications without deleting it (FR-ADM-21/22).
 */
@Schema({ timestamps: true, collection: "products" })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  /**
   * Short code used in the Application ID, e.g. "PL" -> FF-PL-260712-0091.
   * Unique across products; derived from the name if not set.
   */
  @Prop({ required: true, uppercase: true, trim: true, unique: true })
  code!: string;

  @Prop({ type: String, enum: ProductKind, default: ProductKind.Loan })
  kind!: ProductKind;

  /** Card subtitle on the Home screen, e.g. "Life, Health, Vehicle". */
  @Prop({ trim: true })
  subtitle?: string;

  /** Stored image key for the card art (served via /files/<key>). */
  @Prop()
  imageRef?: string;

  @Prop({ required: true })
  interestRateMin!: number;

  @Prop({ required: true })
  interestRateMax!: number;

  /** Free text or numeric range — FRS §9.6. */
  @Prop()
  processingFee?: string;

  @Prop({
    type: String,
    enum: CommissionType,
    default: CommissionType.Percentage,
  })
  commissionType!: CommissionType;

  /** Percentage (e.g. 1.5) or flat rupee value, per {@link commissionType}. */
  @Prop({ required: true, default: 0 })
  commissionValue!: number;

  @Prop({ default: true, index: true })
  active!: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
