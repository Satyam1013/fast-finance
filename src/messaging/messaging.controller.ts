import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";
import { MessagingService } from "./messaging.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";

class PostMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}

@ApiTags("messaging")
@ApiBearerAuth()
@Controller("applications/:id/messages")
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  /** FR-CUS-21 — shared thread for the application (marks it read for the caller). */
  @Get()
  thread(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.messaging.thread(id, user);
  }

  /** FR-CUS-21 / FR-STF-12 — post a message as customer or assigned staff. */
  @Post()
  post(
    @Param("id") id: string,
    @Body() dto: PostMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messaging.postUser(id, dto.body, user);
  }
}
