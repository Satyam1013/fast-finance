import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Role } from "../../common/constants";

export type LoanOfferDocument = HydratedDocument<LoanOffer> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum OfferStatus {
  Pending = "PENDING",
  Accepted = "ACCEPTED",
  Rejected = "REJECTED",
}

/**
 * Sanction offer for an application at Stage 3 (Loan Offer) — PRD §6.
 * Set by Staff, Partner (DSA) or Admin; accepted/rejected by the Customer.
 * One offer per application (re-set while PENDING replaces it; locked once
 * ACCEPTED — corrections after that go through Admin's stage-revert path).
 */
@Schema({ timestamps: true, collection: "loan_offers" })
export class LoanOffer {
  @Prop({ required: true, unique: true, index: true })
  applicationId!: string;

  @Prop({ required: true })
  loanAmount!: number;

  /** Annual interest rate, percent. */
  @Prop({ required: true })
  interestRate!: number;

  @Prop({ required: true })
  tenureMonths!: number;

  @Prop()
  processingFee?: string;

  /** Computed from the three fields above via the same reducing-balance formula as /tools/emi. */
  @Prop({ required: true })
  emiAmount!: number;

  @Prop({ type: String, enum: OfferStatus, default: OfferStatus.Pending })
  status!: OfferStatus;

  @Prop({ required: true })
  setById!: string;

  @Prop({ type: String, enum: Role, required: true })
  setByRole!: Role;

  @Prop()
  respondedAt?: Date;

  /** Customer's reason, when declining. */
  @Prop()
  customerNote?: string;
}

export const LoanOfferSchema = SchemaFactory.createForClass(LoanOffer);
