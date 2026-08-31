import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { CommissionStatus } from "../../common/constants";
import { CommissionType } from "../../catalogue/schemas/product.schema";

export type CommissionDocument = HydratedDocument<Commission> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Commission / Earning — FRS §9.7, PRD §6.1 "Why this matters".
 *
 * Computed EXACTLY ONCE, at the moment an application reaches Disbursed
 * (stage 7) and is not rejected. The rate/type in effect at that moment is
 * snapshotted here so a later change to the product's commission config never
 * silently shifts historical partner earnings (FR-PTR-22, PRD Risk row 2).
 */
@Schema({ timestamps: true, collection: "commissions" })
export class Commission {
  @Prop({ required: true, index: true })
  partnerId!: string;

  @Prop({ required: true, unique: true, index: true })
  applicationId!: string;

  @Prop({ required: true })
  productId!: string;

  // ── Snapshot of the calculation inputs (never re-read from Product) ──
  @Prop({ required: true })
  loanAmount!: number;

  @Prop({ type: String, enum: CommissionType, required: true })
  commissionType!: CommissionType;

  @Prop({ required: true })
  commissionValue!: number;

  @Prop({ required: true })
  amount!: number;

  @Prop({
    type: String,
    enum: CommissionStatus,
    default: CommissionStatus.Payable,
    index: true,
  })
  status!: CommissionStatus;

  @Prop()
  disbursedAt!: Date;

  @Prop()
  payoutDate?: Date;
}

export const CommissionSchema = SchemaFactory.createForClass(Commission);
