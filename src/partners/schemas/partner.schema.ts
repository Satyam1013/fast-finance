import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { PartnerStatus, VerificationStatus } from "../../common/constants";

export type PartnerDocument = HydratedDocument<Partner> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Partner (DSA) — FRS §9.5. External referral agent. Login is the partner code
 * alone (PRD P-01) — validate against ACTIVE partners only; an inactive
 * partner's code must not grant access (FRS §10.1).
 */
@Schema({ timestamps: true, collection: "partners" })
export class Partner {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ trim: true })
  city?: string;

  /** Auto-generated, unique, e.g. FFP-7Q2K — FR-ADM-15. */
  @Prop({ required: true, unique: true, uppercase: true, index: true })
  partnerCode!: string;

  @Prop({
    type: String,
    enum: PartnerStatus,
    default: PartnerStatus.Active,
    index: true,
  })
  status!: PartnerStatus;

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.Pending,
  })
  kycStatus!: VerificationStatus;

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.Pending,
  })
  bankVerifiedStatus!: VerificationStatus;

  /** Denormalised lifetime earnings for the Partner home — FR-PTR-21 / PRD P-10. */
  @Prop({ default: 0 })
  lifetimeEarnings!: number;

  @Prop()
  joinedAt?: Date;

  /** Set when this same person is also a customer — PRD §2.2 Edge Case. */
  @Prop({ index: true })
  linkedCustomerId?: string;
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);
