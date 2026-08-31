import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { EmploymentCategory } from "../../common/constants";

export type CustomerDocument = HydratedDocument<Customer> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Customer — FRS §9.3. End customer applying for a loan / insurance product.
 * Identity is the mobile number (mobile + OTP login, PRD §2.2).
 *
 * Aadhaar and PAN are stored encrypted at rest and returned masked in the UI
 * wherever the full value is not required (NFR-03, PRD §8, FR-CUS-23). The
 * encryption hook is a TODO — see documents/README once storage is wired.
 */
@Schema({ timestamps: true, collection: "customers" })
export class Customer {
  // Captured later at FR-CUS-07 (full name as per PAN). Identity is the mobile.
  @Prop({ trim: true, default: "" })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  mobile!: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop()
  dob?: Date;

  // ── Create Profile screen — FR-CUS-07 ──

  /** "Type of Employment" dropdown. Binary split derived at application time. */
  @Prop({ type: String, enum: EmploymentCategory })
  employmentCategory?: EmploymentCategory;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  city?: string;

  /** Used for the nearest-lender pincode search — FR-CUS-05. */
  @Prop({ index: true })
  pincode?: string;

  // ── Stored file keys (served via /files/<key>) ──

  /** Profile picture — required on the Create Profile screen. */
  @Prop()
  photoRef?: string;

  @Prop()
  aadhaarFrontRef?: string;

  @Prop()
  aadhaarBackRef?: string;

  @Prop()
  panCardRef?: string;

  // TODO(security): encrypt before persist, decrypt on read; never log.
  // Captured later (OCR / manual) — the Create Profile screen only takes scans.
  @Prop({ select: false })
  aadhaar?: string;

  @Prop({ select: false })
  pan?: string;

  /** Set once the mandatory Create-Profile fields are all present. */
  @Prop()
  profileCompletedAt?: Date;

  /**
   * Set when this same person is also a partner (DSA who takes a personal
   * loan). The two profiles stay distinct — PRD §2.2 Edge Case.
   */
  @Prop({ index: true })
  linkedPartnerId?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
