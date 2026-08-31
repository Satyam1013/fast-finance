import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { GstStatus } from "../../common/constants";

export type GstRecordDocument = HydratedDocument<GstRecord> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * GST monthly ledger row — FRS §9.8 / §7.6, PRD A-10.
 * GST is calculated at the applicable rate (GST_RATE_PERCENT) on recorded
 * revenue for the month (FR-ADM-26).
 */
@Schema({ timestamps: true, collection: "gst_records" })
export class GstRecord {
  /** ISO month key, e.g. "2026-07". */
  @Prop({ required: true, unique: true, index: true })
  month!: string;

  @Prop({ default: 0 })
  revenue!: number;

  @Prop({ default: 0 })
  gstCollected!: number;

  @Prop({ default: 0 })
  gstPaid!: number;

  @Prop({ type: String, enum: GstStatus, default: GstStatus.Due })
  status!: GstStatus;

  @Prop()
  filedAt?: Date;
}

export const GstRecordSchema = SchemaFactory.createForClass(GstRecord);
