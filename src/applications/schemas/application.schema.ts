import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { EmploymentType, FIRST_STAGE, Stage } from "../../common/constants";

export type ApplicationDocument = HydratedDocument<Application> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Profile captured at FR-CUS-07 / FR-PTR-09. */
@Schema({ _id: false })
export class ApplicantProfile {
  @Prop({ required: true }) fullName!: string; // as per PAN
  @Prop({ required: true }) mobile!: string;
  @Prop() email?: string;
  @Prop({ type: String, enum: EmploymentType }) employmentType?: EmploymentType;
  @Prop() monthlySalary?: number;
  @Prop() salaryMode?: string;
  @Prop() age?: number;
  @Prop() workExperienceMonths?: number;
  @Prop() currentEMI?: number;
  @Prop() companyName?: string;
}
const ApplicantProfileSchema = SchemaFactory.createForClass(ApplicantProfile);

/**
 * Application — FRS §9.1. One customer loan/insurance request. `stage` is the
 * single source of truth (§10.1) — an integer 1–7, NOT derived, with a
 * separate `isRejected` flag so an application can be rejected from any stage
 * (§3.1 Developer Note).
 */
@Schema({ timestamps: true, collection: "applications" })
export class Application {
  /** Human-readable, unique, shown to the user — FR-CUS-08. e.g. FF-2608-000123 */
  @Prop({ required: true, unique: true, index: true })
  applicationId!: string;

  @Prop({ required: true, index: true })
  customerId!: string;

  @Prop({ required: true, index: true })
  productId!: string;

  /** Denormalised for list views (FR-STF-02, FR-PTR-16). */
  @Prop({ required: true })
  productName!: string;

  @Prop({ type: Number, enum: Stage, default: FIRST_STAGE, index: true })
  stage!: Stage;

  @Prop({ default: false, index: true })
  isRejected!: boolean;

  /** Mandatory when isRejected — FRS §3.1 / PRD §6.1. */
  @Prop()
  rejectionReason?: string;

  @Prop()
  rejectedAt?: Date;

  /** Set true once stage 7 is reached — application is read-only after (PRD §6.1). */
  @Prop({ default: false })
  locked!: boolean;

  @Prop({ default: 0 })
  loanAmount!: number;

  /** Currently assigned staff — FR-ADM-07 reassignment updates this. */
  @Prop({ required: true, index: true })
  staffId!: string;

  /** Set only if the application was referred by a partner — FRS §9.1. */
  @Prop({ index: true })
  partnerId?: string;

  @Prop({ type: ApplicantProfileSchema, required: true })
  profile!: ApplicantProfile;

  /** Bank statement path chosen for this application — see documents module. */
  @Prop()
  submittedAt?: Date;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// A customer may hold at most one in-progress (stage 1, not rejected)
// application per product — the duplicate-prevention rule (FR-CUS-04 / §10.1)
// is enforced in the service; this partial index is a backstop.
ApplicationSchema.index(
  { customerId: 1, productId: 1, stage: 1 },
  { partialFilterExpression: { stage: FIRST_STAGE, isRejected: false } },
);
