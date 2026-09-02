import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OtpRequestDocument = HydratedDocument<OtpRequest> & {
  createdAt: Date;
};

/**
 * Customer login OTP — FR-CUS (mobile + OTP). The code is stored hashed.
 * Rate-limit issuance per mobile in the service. Delivery is WhatsApp via
 * MacroPage Connect (CommsService); OTP_DEV_MODE short-circuits it in dev.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: "otp_requests",
})
export class OtpRequest {
  @Prop({ required: true, index: true })
  mobile!: string;

  @Prop({ required: true })
  codeHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ default: false })
  consumed!: boolean;
}

export const OtpRequestSchema = SchemaFactory.createForClass(OtpRequest);
OtpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
