import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { PartnerLoginDto } from "./dto/partner-login.dto";
import { StaffLoginDto } from "./dto/staff-login.dto";
import { LogoutDto, RefreshDto } from "./dto/refresh.dto";
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from "./dto/reset-password.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ── Customer ──
  // "otp/send" is a compatibility alias for the frontend's original path —
  // "otp/request" is the documented one (see the Excel / OpenAPI docs).
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post(["otp/request", "otp/send"])
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.mobile);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("otp/verify")
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.mobile, dto.code);
  }

  // ── Partner ──
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("partner/login")
  @HttpCode(200)
  partnerLogin(@Body() dto: PartnerLoginDto) {
    return this.auth.partnerLogin(dto.partnerCode);
  }

  // ── Staff / Admin ──
  // "login" is a compatibility alias for the admin panel's originally-expected
  // path — "staff/login" is the documented one; same body, same response.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(["staff/login", "login"])
  @HttpCode(200)
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.auth.staffLogin(dto.email, dto.password);
  }

  /** Admin panel "forgot password" — no user enumeration either way. */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("reset-password")
  @HttpCode(200)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reset-password/confirm")
  @HttpCode(200)
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.auth.confirmPasswordReset(dto.token, dto.password);
  }

  // ── Shared ──
  // "refresh-token" is a compatibility alias — "refresh" is the documented path.
  @Public()
  @Post(["refresh", "refresh-token"])
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  @HttpCode(200)
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return { success: true, user };
  }
}
