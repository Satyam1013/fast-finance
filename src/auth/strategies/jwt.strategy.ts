import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "../auth.types";
import { AuthUser } from "../../common/interfaces/authenticated-request";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET")!,
    });
  }

  /** Return value is attached to `req.user`. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.auth.resolveSubject(payload.sub, payload.role);
    if (!user) throw new UnauthorizedException("Account not found or inactive");
    return user;
  }
}
