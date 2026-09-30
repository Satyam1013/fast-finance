import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";

class BroadcastDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(2) description!: string;
}

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** FR-CUS-24 — the caller's notifications, newest first, with unread count. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user);
  }

  @Post("read-all")
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Post(":id/read")
  read(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.notifications.markRead(id, user);
  }

  /** Swipe-to-delete on the Notifications screen. */
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.notifications.remove(id, user);
  }
}

/**
 * Admin panel — broadcast to every customer. A separate controller (its own
 * path prefix) because bare `GET/POST /notifications` above is already the
 * caller's own notification centre — this lives under `/admin/notifications`
 * only, no bare alias.
 */
@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@Controller("admin/notifications")
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  adminList() {
    return this.notifications.adminList();
  }

  @Post()
  broadcast(@Body() dto: BroadcastDto) {
    return this.notifications.broadcast(dto.title, dto.description);
  }
}
