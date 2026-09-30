import type { Types } from "mongoose";
import { STAGE_SHORT_LABELS, type Stage } from "../../common/constants";
import { maskAadhaar, maskPan } from "../../common/util/mask";
import { toIdString } from "../../common/util/id";
import type { Application } from "../../applications/schemas/application.schema";
import type { Customer } from "../../customers/schemas/customer.schema";

type CustomerLean = Customer & {
  _id?: Types.ObjectId | string;
  createdAt?: Date;
};
type ApplicationLean = Application & { _id?: Types.ObjectId | string };

/**
 * Pure — no DI, no DB access — so both `AdminCustomersService` (the panel's
 * `/customers` list) and `ReportsService` (`/reports/customer`, same shape)
 * can share it without importing one another's module.
 */
export function buildCustomerRow(
  customer: CustomerLean,
  latestApp: ApplicationLean | undefined,
  staffById: Map<string, { id: string; name: string }>,
  partnerById: Map<string, { id: string; name: string; partnerCode: string }>,
) {
  const staff = latestApp?.staffId
    ? (staffById.get(latestApp.staffId) ?? null)
    : null;
  const partner = latestApp?.partnerId
    ? (partnerById.get(latestApp.partnerId) ?? null)
    : null;
  const status = latestApp
    ? latestApp.isRejected
      ? "Rejected"
      : STAGE_SHORT_LABELS[latestApp.stage as Stage]
    : null;

  return {
    id: toIdString(customer._id),
    createdAt: customer.createdAt ?? null,
    name: customer.name || null,
    phone: customer.mobile,
    dsa: partner ? { name: partner.name, code: partner.partnerCode } : null,
    address: customer.address ?? null,
    state: customer.state ?? null,
    city: customer.city ?? null,
    pincode: customer.pincode ?? null,
    aadhaar: maskAadhaar(customer.aadhaar) ?? null,
    pan: maskPan(customer.pan) ?? null,
    loan: latestApp?.productName ?? null,
    loanAmount: latestApp?.loanAmount ?? 0,
    status,
    staff,
    onboard: latestApp ? (latestApp.partnerId ? "DSA" : "Direct") : null,
    blocked: customer.blocked,
  };
}
