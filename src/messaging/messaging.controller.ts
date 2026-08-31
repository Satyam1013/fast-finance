import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { MessagingService } from "./messaging.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { MessageSender } from "./schemas/chat-message.schema";
import { Role } from "../common/constants";

class PostMessageDto {
  @IsString() @MinLength(1) body!: string;
}

@ApiTags("messaging")
@ApiBearerAuth()
@Controller("applications/:id/messages")
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  thread(@Param("id") id: string) {
    return this.messaging.thread(id);
  }

  @Post()
  post(
    @Param("id") id: string,
    @Body() dto: PostMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    const sender =
      user.role === Role.Customer
        ? MessageSender.Customer
        : MessageSender.Staff;
    return this.messaging.postUser(id, sender, user.sub, dto.body);
  }
}
