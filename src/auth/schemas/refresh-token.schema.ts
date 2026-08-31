import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Role } from "../../common/constants";

export type RefreshTokenDocument = HydratedDocument<RefreshToken> & {
  createdAt: Date;
};

/**
 * Rotating refresh token — PRD M-02. On refresh the presented token is
 * revoked and a new one issued (rotation); reuse of a revoked token should
 * revoke the whole chain.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: "refresh_tokens",
})
export class RefreshToken {
  @Prop({ required: true, index: true })
  subjectId!: string;

  @Prop({ type: String, enum: Role, required: true })
  role!: Role;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  revoked!: boolean;

  @Prop()
  replacedByHash?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
