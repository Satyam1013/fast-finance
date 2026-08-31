import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Skip {@link JwtAuthGuard} for this route (login, health, catalogue browse). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
