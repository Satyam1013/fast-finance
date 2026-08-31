import { Role, StaffRole } from "../common/constants";

export interface JwtPayload {
  sub: string;
  role: Role;
  staffRole?: StaffRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult extends TokenPair {
  role: Role;
  profile: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
}
