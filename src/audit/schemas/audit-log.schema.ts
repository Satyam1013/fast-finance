import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { AuditAction, Role } from "../../common/constants";

export type AuditLogDocument = HydratedDocument<AuditLog> & { createdAt: Date };

/**
 * Audit trail — PRD A-13. Every stage change, verification, rejection and
 * reassignment is logged with the actor. Append-only; no updates.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: "audit_logs",
})
export class AuditLog {
  @Prop({ type: String, enum: AuditAction, required: true, index: true })
  action!: AuditAction;

  /** Entity the action was performed on (usually an applicationId). */
  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop()
  targetType?: string;

  // ── Actor ──
  @Prop({ required: true })
  actorId!: string;

  @Prop({ type: String, enum: Role, required: true })
  actorRole!: Role;

  @Prop()
  actorName?: string;

  // ── What changed ──
  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  @Prop()
  reason?: string;

  @Prop()
  ipAddress?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
