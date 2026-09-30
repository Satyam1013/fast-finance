import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import {
  DocumentEntity,
  DocumentEntityDocument,
} from "../documents/schemas/document.schema";
import { ApplicationsService } from "../applications/applications.service";
import { CustomersService } from "../customers/customers.service";
import { StaffService } from "../staff/staff.service";
import { PartnersService } from "../partners/partners.service";
import { StorageService } from "../storage/storage.service";
import { buildCustomerRow } from "./util/build-customer-row";
import { DOCUMENT_LABELS, STAGE_SHORT_LABELS } from "../common/constants";
import { toIdString } from "../common/util/id";
import type { AuthUser } from "../common/interfaces/authenticated-request";

export interface CustomerPanelFilters {
  search?: string;
  from?: string;
  to?: string;
  loan?: string;
  onboard?: string;
  blocked?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminCustomersService {
  constructor(
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    // Read-only — no module cycle: AdminModule is a top-level consumer, not
    // imported by anything (see CLAUDE.md's cycle-avoidance pattern; this is
    // the same shape, just from the top rather than a sibling module).
    @InjectModel(DocumentEntity.name)
    private readonly documents: Model<DocumentEntityDocument>,
    private readonly applicationsService: ApplicationsService,
    private readonly customers: CustomersService,
    private readonly staff: StaffService,
    private readonly partners: PartnersService,
    private readonly storage: StorageService,
  ) {}

  /** Every customer's latest application, batched to avoid an N+1 query. */
  private async latestApplicationByCustomer(customerIds: string[]) {
    if (!customerIds.length) return new Map<string, ApplicationDocument>();
    const apps = await this.applications
      .find({ customerId: { $in: customerIds } })
      .sort({ createdAt: -1 })
      .lean();
    const map = new Map<string, (typeof apps)[number]>();
    for (const a of apps) {
      // Sorted desc — the first one seen per customer is the latest.
      if (!map.has(a.customerId)) map.set(a.customerId, a);
    }
    return map;
  }

  async list(filters: CustomerPanelFilters) {
    const rows = await this.customers.queryForAdminPanel(filters);
    const ids = rows.map((c) => toIdString(c._id));
    const latestByCustomer = await this.latestApplicationByCustomer(ids);

    const staffIds = [
      ...new Set([...latestByCustomer.values()].map((a) => a.staffId)),
    ];
    const partnerIds = [
      ...new Set(
        [...latestByCustomer.values()]
          .map((a) => a.partnerId)
          .filter((v): v is string => !!v),
      ),
    ];
    const [staffRows, partnerRows] = await Promise.all([
      this.staff.findManyByIds(staffIds),
      this.partners.findManyByIds(partnerIds),
    ]);
    const staffById = new Map(staffRows.map((s) => [s.id, s]));
    const partnerById = new Map(partnerRows.map((p) => [p.id, p]));

    let built = rows.map((c) =>
      buildCustomerRow(
        c,
        latestByCustomer.get(toIdString(c._id)),
        staffById,
        partnerById,
      ),
    );

    if (filters.onboard)
      built = built.filter((r) => r.onboard === filters.onboard);
    if (filters.loan) {
      const rx = new RegExp(filters.loan.trim(), "i");
      built = built.filter((r) => r.loan && rx.test(r.loan));
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const start = (page - 1) * limit;

    return {
      total: built.length,
      page,
      results: built.slice(start, start + limit),
    };
  }

  async export(filters: CustomerPanelFilters) {
    const { results } = await this.list({ ...filters, page: 1, limit: 10_000 });
    return results;
  }

  async detail(id: string) {
    const customer = await this.customers.findById(id);
    if (!customer) throw new NotFoundException("Customer not found");

    const latestApp = await this.applications
      .findOne({ customerId: id })
      .sort({ createdAt: -1 })
      .lean();
    const staffId: string | undefined = latestApp?.staffId;
    const partnerId: string | undefined = latestApp?.partnerId;
    const staffRows: Array<{ id: string; name: string }> = staffId
      ? await this.staff.findManyByIds([staffId])
      : [];
    const partnerRows: Array<{
      id: string;
      name: string;
      partnerCode: string;
    }> = partnerId ? await this.partners.findManyByIds([partnerId]) : [];
    // Kept out of the Promise.all above — `.lean()`'s inferred `any` would
    // otherwise widen the whole tuple (a known array-literal inference quirk).
    const documents = latestApp
      ? await this.documents
          .find({ applicationId: toIdString(latestApp._id) })
          .lean()
      : [];

    const row = buildCustomerRow(
      customer,
      latestApp ?? undefined,
      new Map(staffRows.map((s) => [s.id, s])),
      new Map(partnerRows.map((p) => [p.id, p])),
    );

    return {
      ...row,
      email: customer.email ?? null,
      note: customer.note ?? null,
      applicationId: latestApp?.applicationId ?? null,
      documents: documents.map((d) => ({
        label: DOCUMENT_LABELS[d.type],
        fileUrl: this.storage.urlFor(d.fileRef) ?? null,
      })),
    };
  }

  setBlocked(id: string, blocked: boolean, actor: AuthUser) {
    return this.customers.setBlocked(id, blocked, actor);
  }

  setNote(id: string, note: string) {
    return this.customers.setNote(id, note);
  }

  /**
   * `{status, note}` -> the matching stage transition. Stages only ever move
   * one step at a time (CLAUDE.md / PRD §6.1) — this endpoint accepts an
   * arbitrary target label, so it maps to advance/revert/reject rather than
   * writing `stage` directly, and refuses a jump of more than one step.
   */
  async setStatus(
    id: string,
    status: string,
    note: string | undefined,
    actor: AuthUser,
  ) {
    const app = await this.applications
      .findOne({ customerId: id })
      .sort({ createdAt: -1 });
    if (!app)
      throw new NotFoundException("This customer has no application yet");

    if (status.trim().toLowerCase() === "rejected") {
      if (!note?.trim()) {
        throw new BadRequestException({
          success: false,
          code: "NOTE_REQUIRED",
          message: "A note is required to reject an application.",
        });
      }
      return this.applicationsService.reject(app.id, note.trim(), actor);
    }

    const stages = Object.entries(STAGE_SHORT_LABELS) as Array<
      [string, string]
    >;
    const target = stages.find(([, label]) => label === status)?.[0];
    if (target === undefined) {
      throw new BadRequestException({
        success: false,
        code: "STATUS_UNKNOWN",
        message: `Unrecognised status "${status}".`,
      });
    }
    const targetStage = Number(target);

    if (targetStage === app.stage) return { success: true };
    if (targetStage === app.stage + 1) {
      return this.applicationsService.advanceStage(app.id, actor);
    }
    if (targetStage === app.stage - 1) {
      return this.applicationsService.revertStage(app.id, actor);
    }
    throw new BadRequestException({
      success: false,
      code: "STAGE_SKIP_NOT_ALLOWED",
      message:
        "Stages move one step at a time — advance or revert, not a direct jump.",
    });
  }

  setStaff(id: string, staffId: string, actor: AuthUser) {
    return this.applications
      .findOne({ customerId: id })
      .sort({ createdAt: -1 })
      .then((app) => {
        if (!app)
          throw new NotFoundException("This customer has no application yet");
        return this.applicationsService.reassignStaff(app.id, staffId, actor);
      });
  }
}
