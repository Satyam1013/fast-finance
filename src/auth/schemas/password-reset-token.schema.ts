import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type PasswordResetTokenDocument =
  HydratedDocument<PasswordResetToken> & {
    createdAt: Date;
    updatedAt: Date;
  };

/**
 * Staff/Admin "forgot password" — POST /auth/reset-password. The raw token is
 * only ever in the (would-be) email link; this collection stores just its hash
 * (same sha256-then-compare pattern as {@link RefreshToken} / OtpRequest).
 *
 * TODO(email): no SMTP/email provider is wired yet — `AuthService` logs the
 * raw link and, outside production, echoes it in the response so the flow is
 * testable end-to-end. Wire a real provider before relying on this in prod.
 */
@Schema({ timestamps: true, collection: "password_reset_tokens" })
export class PasswordResetToken {
  @Prop({ required: true, index: true })
  staffId!: string;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  usedAt?: Date;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
