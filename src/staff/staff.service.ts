import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, type Types } from "mongoose";
import * as bcrypt from "bcryptjs";
import { ConfigService } from "@nestjs/config";
import { Staff, StaffDocument } from "./schemas/staff.schema";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import {
  RefreshToken,
  RefreshTokenDocument,
} from "../auth/schemas/refresh-token.schema";
import {
  AuditAction,
  Role,
  STAFF_DESIGNATION_LABELS,
  StaffDesignation,
  StaffRole,
} from "../common/constants";
import { toIdString } from "../common/util/id";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/interfaces/authenticated-request";

export interface StaffAdminListFilters {
  search?: string;
  from?: string;
  to?: string;
  blocked?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class StaffService {
  constructor(
    @InjectModel(Staff.name) private readonly staff: Model<StaffDocument>,
    // Read-only — same model as ApplicationsModule, no module cycle (mirrors
    // MessagingModule/DocumentsModule/OffersModule; see CLAUDE.md). Only used
    // here to count customers currently assigned to each staff member.
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    // Read/write here purely to kill sessions the instant a staff member is
    // blocked or their password is reset — same model AuthModule registers.
    @InjectModel(RefreshToken.name)
    private readonly refreshTokens: Model<RefreshTokenDocument>,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  findById(id: string) {
    return this.staff.findById(id).lean();
  }

  findManyByIds(ids: string[]): Promise<Array<{ id: string; name: string }>> {
    if (!ids.length) return Promise.resolve([]);
    return this.staff
      .find({ _id: { $in: ids } })
      .lean()
      .then((rows) =>
        rows.map((s) => ({ id: toIdString(s._id), name: s.name })),
      );
  }

  /** Active staff (not admins) an application can be assigned to — FR-PTR-12. */
  listAssignable() {
    return this.staff.find({ active: true, role: Role.Staff }).lean();
  }

  /** Contact card for the customer's "point of contact" — FR-CUS-20 / C-11. */
  async contactCard(staffId: string) {
    const s = await this.staff.findById(staffId).lean();
    if (!s) return null;
    return {
      id: String(s._id),
      name: s.name,
      phone: s.phone,
      staffRole: s.staffRole ?? null,
    };
  }

  /** FR-ADM-10/13 — admin panel Staffs table: search/date/blocked + counts. */
  async adminList(filters: StaffAdminListFilters) {
    const q: Record<string, unknown> = {};
    if (filters.search) {
      const rx = new RegExp(filters.search.trim(), "i");
      q.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    if (filters.from || filters.to) {
      q.createdAt = {
        ...(filters.from ? { $gte: new Date(filters.from) } : {}),
        ...(filters.to ? { $lte: new Date(filters.to) } : {}),
      };
    }
    if (filters.blocked !== undefined) {
      q.active = filters.blocked === "true" ? false : true;
    }

    const rows = await this.staff.find(q).sort({ createdAt: -1 }).lean();
    const ids = rows.map((s) => toIdString(s._id));
    const counts = await this.assignedCounts(ids);

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return {
      total: rows.length,
      page,
      results: paged.map((s) =>
        this.present(s, counts.get(toIdString(s._id)) ?? 0),
      ),
    };
  }

  /** Distinct customers currently assigned to each staff id (not just apps). */
  private async assignedCounts(
    staffIds: string[],
  ): Promise<Map<string, number>> {
    if (!staffIds.length) return new Map();
    const rows = await this.applications.aggregate<{ _id: string; n: number }>([
      { $match: { staffId: { $in: staffIds } } },
      { $group: { _id: { staffId: "$staffId", customerId: "$customerId" } } },
      { $group: { _id: "$_id.staffId", n: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id, r.n]));
  }

  async adminDetail(id: string) {
    const s = await this.staff.findById(id).lean();
    if (!s) throw new NotFoundException("Staff not found");
    const counts = await this.assignedCounts([id]);
    return this.present(s, counts.get(id) ?? 0);
  }

  async adminExport(filters: StaffAdminListFilters) {
    const { results } = await this.adminList({
      ...filters,
      page: 1,
      limit: 10_000,
    });
    return results;
  }

  /** FR-ADM-11 — add a staff member (name, phone, role, email, password). */
  async create(dto: {
    name: string;
    email: string;
    phone: string;
    password: string;
    staffRole?: StaffRole;
    designation?: StaffDesignation;
    joiningDate?: string;
  }) {
    if (await this.staff.exists({ email: dto.email.toLowerCase().trim() })) {
      throw new BadRequestException({
        success: false,
        code: "EMAIL_TAKEN",
        message: "A staff member with this email already exists.",
      });
    }
    const rounds = this.config.get<number>("BCRYPT_ROUNDS", 12);
    const created = await this.staff.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash: await bcrypt.hash(dto.password, rounds),
      role: Role.Staff,
      // Not sent by the admin panel's Add Staff form — default to the most
      // common desk role rather than making the field required there too.
      staffRole: dto.staffRole ?? StaffRole.LoanOfficer,
      designation: dto.designation,
      joinedAt: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
    });
    // `passwordHash` is `select:false` on reads, but a freshly-created
    // in-memory document still carries it — never return it, pre-existing
    // bug fixed here since we're touching this path anyway.
    return this.present(created.toObject(), 0);
  }

  /** Blocking is enforced live: `active:false` fails login AND every request
   * (`AuthService.resolveSubject` re-checks it), so revoking refresh tokens
   * here is belt-and-braces, not the primary control. */
  async setBlocked(id: string, blocked: boolean, actor: AuthUser) {
    const s = await this.staff.findByIdAndUpdate(
      id,
      { active: !blocked },
      { new: true },
    );
    if (!s) throw new NotFoundException("Staff not found");
    if (blocked) {
      await this.refreshTokens.updateMany({ subjectId: id }, { revoked: true });
    }
    await this.audit.record({
      action: blocked ? AuditAction.StaffBlocked : AuditAction.StaffUnblocked,
      targetId: id,
      targetType: "Staff",
      actorId: actor.sub,
      actorRole: actor.role,
      actorName: actor.name,
    });
    return { success: true };
  }

  /** Admin-set password reset — distinct from the self-service email flow. */
  async setPassword(id: string, password: string, actor: AuthUser) {
    const rounds = this.config.get<number>("BCRYPT_ROUNDS", 12);
    const res = await this.staff.updateOne(
      { _id: id },
      { passwordHash: await bcrypt.hash(password, rounds) },
    );
    if (!res.matchedCount) throw new NotFoundException("Staff not found");
    await this.refreshTokens.updateMany({ subjectId: id }, { revoked: true });
    await this.audit.record({
      action: AuditAction.StaffPasswordReset,
      targetId: id,
      targetType: "Staff",
      actorId: actor.sub,
      actorRole: actor.role,
      actorName: actor.name,
    });
    return { success: true };
  }

  /**
   * Shape a staff document for the admin panel. The password hash is never
   * included — not even as a placeholder/reference (the pasted spec asked for
   * one and flagged it as unsafe itself; we just don't return it, full stop).
   */
  private present(
    s: Staff & { _id?: Types.ObjectId | string; createdAt?: Date },
    customersAssigned: number,
  ) {
    return {
      id: toIdString(s._id),
      createdAt: s.createdAt ?? null,
      email: s.email,
      name: s.name,
      phone: s.phone,
      staffRole: s.staffRole ?? null,
      designation: s.designation ?? null,
      designationLabel: s.designation
        ? STAFF_DESIGNATION_LABELS[s.designation]
        : null,
      customersAssigned,
      joiningDate: s.joinedAt ?? null,
      blocked: !s.active,
    };
  }
}
