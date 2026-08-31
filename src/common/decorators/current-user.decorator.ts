import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type {
  AuthUser,
  AuthenticatedRequest,
} from "../interfaces/authenticated-request";

/** `@CurrentUser()` -> the verified {@link AuthUser}; `@CurrentUser("sub")` -> one field. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): unknown => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return data ? req.user?.[data] : req.user;
  },
);
