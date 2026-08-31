import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Role, StaffRole } from "../../common/constants";

export type StaffDocument = HydratedDocument<Staff> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Staff — FRS §9.4. Internal web-panel user. The business owner is a Staff row
 * with `role = ADMIN`; everyone else is `role = STAFF` differentiated by
 * `staffRole` (FR-ADM-12). Login is email + password (PRD §2.2).
 */
@Schema({ timestamps: true, collection: "staff" })
export class Staff {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({ required: true })
  phone!: string;

  // bcrypt hash — never selected by default.
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, enum: [Role.Staff, Role.Admin], default: Role.Staff })
  role!: Role.Staff | Role.Admin;

  @Prop({ type: String, enum: StaffRole })
  staffRole?: StaffRole;

  @Prop({ default: true })
  active!: boolean;

  // ── Performance metrics — FR-STF-13/14 (recomputed, not authoritative) ──
  @Prop({ default: 0 })
  closedThisMonth!: number;

  @Prop()
  rating?: number;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);
