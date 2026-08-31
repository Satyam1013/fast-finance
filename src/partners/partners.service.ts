import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { customAlphabet } from "nanoid";
import { ConfigService } from "@nestjs/config";
import { Partner, PartnerDocument } from "./schemas/partner.schema";
import type { AuthUser } from "../common/interfaces/authenticated-request";

// Unambiguous alphabet — no 0/O/1/I, so codes are easy to read out over a call.
const codeBody = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

@Injectable()
export class PartnersService {
  constructor(
    @InjectModel(Partner.name)
    private readonly partners: Model<PartnerDocument>,
    private readonly config: ConfigService,
  ) {}

  findById(id: string) {
    return this.partners.findById(id).lean();
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

  /** FR-ADM-14 — list all partners with code + city. */
  adminList(): Promise<never> {
    // TODO(FR-ADM-14, FR-ADM-16/17/18): list + per-partner lead & commission rollups.
    throw new NotImplementedException("partners.adminList — not built");
  }

  /** FR-PTR-06 — referral link tied to the partner code. */
  referralLink(_user: AuthUser): Promise<never> {
    // TODO(FR-PTR-06): build a shareable link that pre-tags applications.
    throw new NotImplementedException("partners.referralLink — not built");
  }
}
