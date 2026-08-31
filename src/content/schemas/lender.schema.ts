import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type LenderDocument = HydratedDocument<Lender> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum LenderKind {
  Bank = "BANK",
  Nbfc = "NBFC",
}

/** A partner bank/NBFC branch — used by the FR-CUS-05 pincode search. */
@Schema({ _id: false })
export class LenderBranch {
  @Prop({ required: true, trim: true }) label!: string;
  @Prop({ trim: true }) address?: string;
  @Prop({ trim: true }) city?: string;
  @Prop({ trim: true }) state?: string;
  @Prop({ required: true, index: true }) pincode!: string;
  @Prop() phone?: string;
}
const LenderBranchSchema = SchemaFactory.createForClass(LenderBranch);

/**
 * Partner bank / NBFC — "Our Partnered NBFCs" grid on the Home screen, plus the
 * pincode-based nearby-lender search (FR-CUS-05 / PRD C-12).
 */
@Schema({ timestamps: true, collection: "lenders" })
export class Lender {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, enum: LenderKind, default: LenderKind.Nbfc })
  kind!: LenderKind;

  /** Stored logo key (served via /files/<key>). */
  @Prop()
  logoRef?: string;

  /** Advertised starting interest rate (percent p.a.). */
  @Prop()
  startingRate?: number;

  @Prop({ type: [LenderBranchSchema], default: [] })
  branches!: LenderBranch[];

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true, index: true })
  active!: boolean;
}

export const LenderSchema = SchemaFactory.createForClass(Lender);
