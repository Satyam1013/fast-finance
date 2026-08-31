import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Commission, CommissionDocument } from "./schemas/commission.schema";
import { CommissionType } from "../catalogue/schemas/product.schema";
import type { ApplicationDocument } from "../applications/schemas/application.schema";
import type { ProductDocument } from "../catalogue/schemas/product.schema";

@Injectable()
export class CommissionService {
  constructor(
    @InjectModel(Commission.name)
    private readonly commissions: Model<CommissionDocument>,
  ) {}

  /** Pure calculation — snapshot inputs, never re-read later (PRD §6.1). */
  static compute(
    loanAmount: number,
    type: CommissionType,
    value: number,
  ): number {
    return type === CommissionType.Percentage
      ? Math.round((loanAmount * value) / 100)
      : Math.round(value);
  }

  /**
   * FR-PTR-22 — called ONCE from the stage transaction when an application
   * reaches Disbursed and is not rejected. Idempotent on applicationId
   * (unique index). Also bumps Partner.lifetimeEarnings.
   */
  calculateFor(
    _app: ApplicationDocument,
    _product: ProductDocument,
  ): Promise<CommissionDocument> {
    // TODO: build from the snapshot, upsert on applicationId, update partner
    // rollup, publish "commission.calculated" event, write audit entry.
    return Promise.reject(
      new NotImplementedException("commission.calculateFor — not built"),
    );
  }

  /** FR-PTR-21/23 + FR-ADM-17 — earnings views. */
  earningsForPartner(partnerId: string) {
    return this.commissions
      .find({ partnerId })
      .sort({ disbursedAt: -1 })
      .lean();
  }
}
