import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BankingLinkDocument = HydratedDocument<BankingLink> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DSA portal "Banking Links" tab — a bank's DSA-portal URL plus the shared
 * login DSAs use there.
 *
 * TODO(security): `password` is stored plaintext (`select: false` only keeps
 * it out of default reads/logs — it is NOT encryption at rest). This mirrors
 * the Aadhaar/PAN TODO in `customer.schema.ts`; encrypt before this carries
 * anything but test data.
 */
@Schema({ timestamps: true, collection: "dsa_banking_links" })
export class BankingLink {
  @Prop({ required: true, trim: true })
  bank!: string;

  @Prop({ required: true, trim: true })
  link!: string;

  @Prop({ trim: true })
  rate?: string;

  @Prop({ trim: true })
  accId?: string;

  @Prop({ select: false })
  password?: string;
}

export const BankingLinkSchema = SchemaFactory.createForClass(BankingLink);
