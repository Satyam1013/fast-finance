import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog, AuditLogDocument } from "./schemas/audit-log.schema";
import { AuditAction, Role } from "../common/constants";

export interface AuditEntry {
  action: AuditAction;
  targetId: string;
  targetType?: string;
  actorId: string;
  actorRole: Role;
  actorName?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
}

/** Append-only audit trail — PRD A-13. Inject this anywhere a logged action happens. */
@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly model: Model<AuditLogDocument>,
  ) {}

  record(entry: AuditEntry) {
    return this.model.create(entry);
  }

  findForTarget(targetId: string) {
    return this.model.find({ targetId }).sort({ createdAt: -1 }).lean();
  }
}
