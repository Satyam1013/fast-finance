import type { Request } from "express";
import type { Role, StaffRole } from "../constants";

/**
 * Shape attached to `req.user` by {@link JwtStrategy} after a token is verified.
 * `sub` is the Mongo _id of the underlying Customer / Partner / Staff document.
 */
export interface AuthUser {
  sub: string;
  role: Role;
  /** Present only when role === STAFF or ADMIN. */
  staffRole?: StaffRole;
  /** Denormalised for convenience in logs / audit. */
  name?: string;
  mobile?: string;
  /** Partner code, present only when role === PARTNER. */
  partnerCode?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
