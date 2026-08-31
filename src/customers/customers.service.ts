import { Injectable, NotImplementedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Customer, CustomerDocument } from "./schemas/customer.schema";
import type { AuthUser } from "../common/interfaces/authenticated-request";

/**
 * Customer records. Read access is SCOPED by role (FRS §2.2 customerRecords):
 *   Customer -> own   Partner -> own leads   Staff -> assigned   Admin -> all
 * Resolve the caller's scope with `scopeFor("customerRecords", role)` and
 * constrain every query — never trust an id from the URL (NFR-02, PRD §7).
 */
@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customers: Model<CustomerDocument>,
  ) {}

  findById(id: string) {
    return this.customers.findById(id).lean();
  }

  /** FR-CUS-23 — profile screen with masked Aadhaar/PAN. */
  getOwnProfile(user: AuthUser) {
    return this.customers.findById(user.sub).lean();
  }

  updateOwnProfile(_user: AuthUser, _dto: unknown): Promise<never> {
    // TODO(FR-CUS-07): validate + persist profile fields.
    throw new NotImplementedException("customers.updateOwnProfile — not built");
  }

  /** FR-ADM-04/05, FR-STF-01/03 — list/get with role scoping applied by caller. */
  adminList(_query: unknown): Promise<never> {
    // TODO(FR-ADM-04, FR-ADM-09): paginated search across all customers.
    throw new NotImplementedException("customers.adminList — not built");
  }
}
