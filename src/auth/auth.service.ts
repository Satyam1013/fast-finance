import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createHash, randomBytes, randomInt } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { Role } from "../common/constants";
import { AuthUser } from "../common/interfaces/authenticated-request";
import { AuthResult, JwtPayload, TokenPair } from "./auth.types";
import {
  Customer,
  CustomerDocument,
} from "../customers/schemas/customer.schema";
import { Partner, PartnerDocument } from "../partners/schemas/partner.schema";
import { Staff, StaffDocument } from "../staff/schemas/staff.schema";
import { PartnerStatus } from "../common/constants";
import {
  RefreshToken,
  RefreshTokenDocument,
} from "./schemas/refresh-token.schema";
import { OtpRequest, OtpRequestDocument } from "./schemas/otp-request.schema";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(Customer.name)
    private readonly customers: Model<CustomerDocument>,
    @InjectModel(Partner.name)
    private readonly partners: Model<PartnerDocument>,
    @InjectModel(Staff.name) private readonly staff: Model<StaffDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokens: Model<RefreshTokenDocument>,
    @InjectModel(OtpRequest.name)
    private readonly otpRequests: Model<OtpRequestDocument>,
  ) {}

  // ─────────────────────────────── Customer: OTP ───────────────────────────

  async requestOtp(
    mobile: string,
  ): Promise<{ success: true; devCode?: string }> {
    const ttl = this.config.get<number>("OTP_TTL_SECONDS", 300);

    // Basic anti-abuse: one live OTP per mobile at a time.
    await this.otpRequests.updateMany(
      { mobile, consumed: false },
      { consumed: true },
    );

    const code = this.config.get<boolean>("OTP_DEV_MODE", true)
      ? this.config.get<string>("OTP_DEV_CODE", "000000")
      : String(randomInt(100000, 1000000));

    await this.otpRequests.create({
      mobile,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    // TODO(FR-CUS / PRD OQ#5): send via SMS provider once chosen.
    if (this.config.get<boolean>("OTP_DEV_MODE", true)) {
      this.logger.warn(`DEV OTP for ${mobile}: ${code}`);
      return { success: true, devCode: code };
    }
    return { success: true };
  }

  async verifyOtp(mobile: string, code: string): Promise<AuthResult> {
    const otp = await this.otpRequests
      .findOne({ mobile, consumed: false })
      .sort({ createdAt: -1 });

    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException({
        success: false,
        code: "OTP_INVALID",
        message: "This code has expired. Request a new one.",
      });
    }
    if (otp.attempts >= 5) {
      throw new UnauthorizedException({
        success: false,
        code: "OTP_LOCKED",
        message: "Too many attempts. Request a new code.",
      });
    }
    if (otp.codeHash !== sha256(code)) {
      otp.attempts += 1;
      await otp.save();
      throw new UnauthorizedException({
        success: false,
        code: "OTP_INVALID",
        message: "Incorrect code.",
      });
    }

    otp.consumed = true;
    await otp.save();

    const customer =
      (await this.customers.findOne({ mobile })) ??
      (await this.customers.create({ mobile, name: "" }));

    const tokens = await this.issueTokens({
      sub: customer.id,
      role: Role.Customer,
    });
    return {
      ...tokens,
      role: Role.Customer,
      profile: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
      },
    };
  }

  // ─────────────────────────────── Partner: code ───────────────────────────

  async partnerLogin(partnerCode: string): Promise<AuthResult> {
    const partner = await this.partners.findOne({
      partnerCode: partnerCode.toUpperCase().trim(),
      status: PartnerStatus.Active, // inactive code must not grant access — FRS §10.1
    });
    if (!partner) {
      throw new UnauthorizedException({
        success: false,
        code: "PARTNER_CODE_INVALID",
        message: "This partner code is not recognised.",
      });
    }

    const tokens = await this.issueTokens({
      sub: partner.id,
      role: Role.Partner,
    });
    return {
      ...tokens,
      role: Role.Partner,
      profile: {
        id: partner.id,
        name: partner.name,
        partnerCode: partner.partnerCode,
        city: partner.city,
      },
    };
  }

  // ──────────────────────────── Staff / Admin: password ────────────────────

  async staffLogin(email: string, password: string): Promise<AuthResult> {
    const staff = await this.staff
      .findOne({ email: email.toLowerCase().trim(), active: true })
      .select("+passwordHash");

    if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
      throw new UnauthorizedException({
        success: false,
        code: "CREDENTIALS_INVALID",
        message: "Incorrect email or password.",
      });
    }

    const tokens = await this.issueTokens({
      sub: staff.id,
      role: staff.role,
      staffRole: staff.staffRole,
    });
    return {
      ...tokens,
      role: staff.role,
      profile: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        staffRole: staff.staffRole,
      },
    };
  }

  // ─────────────────────────────── Token lifecycle ─────────────────────────

  async refresh(presented: string): Promise<TokenPair> {
    const hash = sha256(presented);
    const record = await this.refreshTokens.findOne({ tokenHash: hash });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException({
        success: false,
        code: "REFRESH_INVALID",
        message: "Session expired. Please log in again.",
      });
    }
    if (record.revoked) {
      // Reuse of a rotated token — revoke the whole subject's chain.
      await this.refreshTokens.updateMany(
        { subjectId: record.subjectId },
        { revoked: true },
      );
      throw new UnauthorizedException({
        success: false,
        code: "REFRESH_REUSED",
        message: "Session invalidated. Please log in again.",
      });
    }

    const next = await this.issueTokens({
      sub: record.subjectId,
      role: record.role,
    });
    record.revoked = true;
    record.replacedByHash = sha256(next.refreshToken);
    await record.save();
    return next;
  }

  async logout(presented: string): Promise<{ success: true }> {
    await this.refreshTokens.updateOne(
      { tokenHash: sha256(presented) },
      { revoked: true },
    );
    return { success: true };
  }

  /** Called by {@link JwtStrategy} on every request. */
  async resolveSubject(sub: string, role: Role): Promise<AuthUser | null> {
    switch (role) {
      case Role.Customer: {
        const c = await this.customers.findById(sub);
        return c ? { sub: c.id, role, name: c.name, mobile: c.mobile } : null;
      }
      case Role.Partner: {
        const p = await this.partners.findById(sub);
        return p && p.status === PartnerStatus.Active
          ? { sub: p.id, role, name: p.name, partnerCode: p.partnerCode }
          : null;
      }
      case Role.Staff:
      case Role.Admin: {
        const s = await this.staff.findById(sub);
        return s && s.active
          ? { sub: s.id, role: s.role, staffRole: s.staffRole, name: s.name }
          : null;
      }
      default:
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  private async issueTokens(payload: JwtPayload): Promise<TokenPair> {
    const accessTtl = this.config.get<string>("JWT_ACCESS_TTL", "15m");
    const refreshDays = this.config.get<number>("JWT_REFRESH_TTL_DAYS", 30);

    const accessToken = await this.jwt.signAsync(payload, {
      // ms-style string ("15m") or seconds — cast past the strict template type.
      expiresIn: accessTtl as unknown as number,
    });

    // Opaque random string, stored hashed. Not a JWT — cheaper to revoke.
    const refreshToken = `${payload.sub}.${randomBytes(32).toString("hex")}`;
    await this.refreshTokens.create({
      subjectId: payload.sub,
      role: payload.role,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + refreshDays * 86400_000),
    });

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }
}
