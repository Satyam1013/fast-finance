import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role } from "../constants";
import type { AuthenticatedRequest } from "../interfaces/authenticated-request";

/**
 * Coarse role gate. This only checks *which role* may hit the route — it does
 * NOT scope the data (own vs assigned vs all). That scoping lives in each
 * service using `scopeFor()` from common/constants/roles.ts, because a Staff
 * token must never be able to read another staff member's customer by guessing
 * an id (FRS §10.1, NFR-02, PRD §7).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException({
        success: false,
        code: "INSUFFICIENT_ROLE",
        message: `This action requires one of: ${required.join(", ")}`,
      });
    }
    return true;
  }
}
