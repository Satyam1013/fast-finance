import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type FaqDocument = HydratedDocument<Faq> & {
  createdAt: Date;
  updatedAt: Date;
};

/** FAQ entry for the Support screen — FR-CUS-22 / PRD C-13. Admin-managed. */
@Schema({ timestamps: true, collection: "faqs" })
export class Faq {
  @Prop({ required: true, trim: true })
  question!: string;

  @Prop({ required: true })
  answer!: string;

  /** Grouping shown on the Support screen, e.g. "Loans", "KYC", "EMI". */
  @Prop({ trim: true, default: "General" })
  category!: string;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true, index: true })
  active!: boolean;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
