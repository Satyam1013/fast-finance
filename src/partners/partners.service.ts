import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, type Types } from "mongoose";
import { customAlphabet } from "nanoid";
import { ConfigService } from "@nestjs/config";
import { Partner, PartnerDocument } from "./schemas/partner.schema";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import {
  RefreshToken,
  RefreshTokenDocument,
} from "../auth/schemas/refresh-token.schema";
import { StaffService } from "../staff/staff.service";
import { AuditService } from "../audit/audit.service";
import { AuditAction, PartnerStatus } from "../common/constants";
import { toIdString } from "../common/util/id";
import type { AuthUser } from "../common/interfaces/authenticated-request";

// Unambiguous alphabet — no 0/O/1/I, so codes are easy to read out over a call.
const codeBody = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

export interface DsaAdminListFilters {
  search?: string;
  from?: string;
  to?: string;
  blocked?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PartnersService {
  constructor(
    @InjectModel(Partner.name)
    private readonly partners: Model<PartnerDocument>,
    // Read-only — same model as ApplicationsModule, no module cycle (mirrors
    // MessagingModule/DocumentsModule/OffersModule; see CLAUDE.md). Used only
    // to count each DSA's referred customers.
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokens: Model<RefreshTokenDocument>,
    private readonly config: ConfigService,
    private readonly staffService: StaffService,
    private readonly audit: AuditService,
  ) {}

  findById(id: string) {
    return this.partners.findById(id).lean();
  }

  findManyByIds(
    ids: string[],
  ): Promise<Array<{ id: string; name: string; partnerCode: string }>> {
    if (!ids.length) return Promise.resolve([]);
    return this.partners
      .find({ _id: { $in: ids } })
      .lean()
      .then((rows) =>
        rows.map((p) => ({
          id: toIdString(p._id),
          name: p.name,
          partnerCode: p.partnerCode,
        })),
      );
  }

  /** FR-ADM-15 — onboard a partner and auto-generate a unique code. */
  async onboard(dto: {
    name: string;
    phone: string;
    city?: string;
  }): Promise<PartnerDocument> {
    const prefix = this.config.get<string>("PARTNER_CODE_PREFIX", "FFP");
    let partnerCode = "";
    // Retry on the rare collision — partnerCode has a unique index.
    for (let i = 0; i < 5; i++) {
      partnerCode = `${prefix}-${codeBody()}`;
      if (!(await this.partners.exists({ partnerCode }))) break;
    }
    return this.partners.create({ ...dto, partnerCode, joinedAt: new Date() });
  }

  /** FR-PTR-03/04 — partner's own profile card. */
  getOwnProfile(user: AuthUser) {
    return this.partners.findById(user.sub).lean();
  }

  /** FR-ADM-14/16/17/18 — admin panel DSA table: search/date/blocked + counts. */
  async adminListDsa(filters: DsaAdminListFilters) {
    const q: Record<string, unknown> = {};
    if (filters.search) {
      const rx = new RegExp(filters.search.trim(), "i");
      q.$or = [{ name: rx }, { phone: rx }, { partnerCode: rx }];
    }
    if (filters.from || filters.to) {
      q.createdAt = {
        ...(filters.from ? { $gte: new Date(filters.from) } : {}),
        ...(filters.to ? { $lte: new Date(filters.to) } : {}),
      };
    }
    if (filters.blocked !== undefined) {
      q.status =
        filters.blocked === "true"
          ? PartnerStatus.Inactive
          : PartnerStatus.Active;
    }

    const rows = await this.partners.find(q).sort({ createdAt: -1 }).lean();
    // Application.partnerId references the Partner's _id, not its partnerCode.
    const partnerIds = rows.map((p) => toIdString(p._id));
    const [counts, staffRows] = await Promise.all([
      this.customerCounts(partnerIds),
      this.staffService.findManyByIds([
        ...new Set(rows.map((p) => p.staffId).filter((v): v is string => !!v)),
      ]),
    ]);
    const staffMap = new Map(staffRows.map((s) => [s.id, s]));

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return {
      total: rows.length,
      page,
      results: paged.map((p) =>
        this.present(
          p,
          counts.get(toIdString(p._id)) ?? 0,
          p.staffId ? (staffMap.get(p.staffId) ?? null) : null,
        ),
      ),
    };
  }

  /** Distinct customers referred by each partner (via Application.partnerId). */
  private async customerCounts(
    partnerIds: string[],
  ): Promise<Map<string, number>> {
    if (!partnerIds.length) return new Map();
    const rows = await this.applications.aggregate<{ _id: string; n: number }>([
      { $match: { partnerId: { $in: partnerIds } } },
      {
        $group: { _id: { partnerId: "$partnerId", customerId: "$customerId" } },
      },
      { $group: { _id: "$_id.partnerId", n: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id, r.n]));
  }

  async adminExportDsa(filters: DsaAdminListFilters) {
    const { results } = await this.adminListDsa({
      ...filters,
      page: 1,
      limit: 10_000,
    });
    return results;
  }

  /** Historical FR-ADM-14 entry point — same data, no filters. */
  adminList() {
    return this.adminListDsa({});
  }

  async setBlocked(partnerCode: string, blocked: boolean, actor: AuthUser) {
    const p = await this.partners.findOneAndUpdate(
      { partnerCode: partnerCode.toUpperCase().trim() },
      { status: blocked ? PartnerStatus.Inactive : PartnerStatus.Active },
      { new: true },
    );
    if (!p) throw new NotFoundException("DSA not found");
    if (blocked) {
      await this.refreshTokens.updateMany(
        { subjectId: p.id },
        { revoked: true },
      );
    }
    await this.audit.record({
      action: blocked
        ? AuditAction.PartnerBlocked
        : AuditAction.PartnerUnblocked,
      targetId: p.id,
      targetType: "Partner",
      actorId: actor.sub,
      actorRole: actor.role,
      actorName: actor.name,
    });
    return { success: true };
  }

  async setStaff(partnerCode: string, staffId: string) {
    const p = await this.partners.findOneAndUpdate(
      { partnerCode: partnerCode.toUpperCase().trim() },
      { staffId },
      { new: true },
    );
    if (!p) throw new NotFoundException("DSA not found");
    return { success: true };
  }

  /** dsa/stats — DSA counts (learning/cibil/commission/banking come from
   * DsaContentService; kept here since Partner is this module's own model). */
  async counts(): Promise<{ all: number; blocked: number }> {
    const [all, blocked] = await Promise.all([
      this.partners.countDocuments(),
      this.partners.countDocuments({ status: PartnerStatus.Inactive }),
    ]);
    return { all, blocked };
  }

  /** FR-PTR-06 — referral link tied to the partner code. */
  referralLink(_user: AuthUser): Promise<never> {
    // TODO(FR-PTR-06): build a shareable link that pre-tags applications.
    throw new NotImplementedException("partners.referralLink — not built");
  }

  private present(
    p: Partner & { _id?: Types.ObjectId | string; createdAt?: Date },
    customersCount: number,
    staff: { id: string; name: string } | null,
  ) {
    return {
      code: p.partnerCode,
      createdAt: p.createdAt ?? null,
      name: p.name,
      phone: p.phone,
      customersCount,
      staff,
      blocked: p.status !== PartnerStatus.Active,
    };
  }
}
