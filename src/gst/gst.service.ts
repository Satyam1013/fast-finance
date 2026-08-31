import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { GstRecord, GstRecordDocument } from "./schemas/gst-record.schema";

@Injectable()
export class GstService {
  constructor(
    @InjectModel(GstRecord.name)
    private readonly records: Model<GstRecordDocument>,
    private readonly config: ConfigService,
  ) {}

  private get rate(): number {
    return this.config.get<number>("GST_RATE_PERCENT", 18);
  }

  /** GST on recorded revenue at the applicable rate — FR-ADM-26. */
  gstOn(revenue: number): number {
    return Math.round((revenue * this.rate) / 100);
  }

  /** FR-ADM-24/25 — dashboard totals + month-wise breakdown. */
  dashboard(): Promise<never> {
    // TODO(FR-ADM-24): totals (revenue, collected, paid, payable) + monthly rows.
    throw new NotImplementedException("gst.dashboard — not built");
  }

  /** FR-ADM-28 — export the GST summary as PDF and Excel (see reports module). */
  export(_format: "pdf" | "excel"): Promise<never> {
    throw new NotImplementedException("gst.export — not built");
  }
}
