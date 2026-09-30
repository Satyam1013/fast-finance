import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import { ApplicationsService } from "../applications/applications.service";
import { CustomersService } from "../customers/customers.service";
import { StaffService } from "../staff/staff.service";
import { PartnersService } from "../partners/partners.service";
import { Banner, BannerDocument } from "../content/schemas/banner.schema";
import { FINAL_STAGE, FIRST_STAGE } from "../common/constants";
import type { AuthUser } from "../common/interfaces/authenticated-request";

interface StageCount {
  _id: number;
  count: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    // Read-only — used only for the dashboard's appBanners count; a full
    // ContentModule import isn't needed for one countDocuments() call.
    @InjectModel(Banner.name)
    private readonly banners: Model<BannerDocument>,
    private readonly applicationsService: ApplicationsService,
    private readonly customers: CustomersService,
    private readonly staff: StaffService,
    private readonly partners: PartnersService,
  ) {}

  /**
   * FR-ADM-01/02/03 — business overview: totals + count of applications per
   * stage for the pipeline visualisation.
   */
  async overview() {
    const perStage: StageCount[] = await this.applications.aggregate([
      { $match: { isRejected: false } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]);
    const countAt = (stage: number): number =>
      perStage.find((r) => r._id === stage)?.count ?? 0;

    const pipeline: Record<number, number> = {};
    let inProgress = 0;
    for (let s = FIRST_STAGE; s <= FINAL_STAGE; s++) {
      pipeline[s] = countAt(s);
      if (s < FINAL_STAGE) inProgress += pipeline[s];
    }

    // TODO(FR-ADM-01): totalCustomers, totalStaff, totalDisbursedAmount.
    return { success: true, applicationsInProgress: inProgress, pipeline };
  }

  /** GET /dashboard/stats — admin panel home tile counts. */
  async stats() {
    const [customersCount, dsaCounts, staffsCount, appBanners] =
      await Promise.all([
        this.customers.countAll(),
        this.partners.counts(),
        this.staff.adminList({ limit: 1 }).then((r) => r.total),
        this.banners.countDocuments({ active: true }),
      ]);
    return {
      customers: customersCount,
      dsas: dsaCounts.all,
      staffs: staffsCount,
      appBanners,
    };
  }

  /**
   * FR-ADM-07 / TC-SYNC-02 — reassign an application between staff members.
   * Mutation lives in ApplicationsService (CLAUDE.md); this is a thin pass-through.
   */
  reassign(applicationId: string, toStaffId: string, actor: AuthUser) {
    return this.applicationsService.reassignStaff(
      applicationId,
      toStaffId,
      actor,
    );
  }
}
