import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
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

  /**
   * FR-ADM-07 / TC-SYNC-02 — reassign an application between staff members.
   * Single transaction: update staffId, audit with actor, notify both staff.
   */
  reassign(
    _applicationId: string,
    _toStaffId: string,
    _actor: AuthUser,
  ): Promise<never> {
    throw new NotImplementedException("admin.reassign — not built");
  }
}
