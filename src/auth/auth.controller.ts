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

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ── Customer ──
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("otp/request")
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
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("staff/login")
  @HttpCode(200)
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.auth.staffLogin(dto.email, dto.password);
  }

  // ── Shared ──
  @Public()
  @Post("refresh")
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
