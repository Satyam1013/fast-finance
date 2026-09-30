import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { StaffService } from "./staff.service";
import { StaffController } from "./staff.controller";
import { Staff, StaffSchema } from "./schemas/staff.schema";
import {
  Application,
  ApplicationSchema,
} from "../applications/schemas/application.schema";
import {
  RefreshToken,
  RefreshTokenSchema,
} from "../auth/schemas/refresh-token.schema";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      // Read-only — same model as ApplicationsModule, no module cycle (mirrors
      // MessagingModule/DocumentsModule/OffersModule; see CLAUDE.md).
      { name: Application.name, schema: ApplicationSchema },
      // Read/write — same model as AuthModule; used only to kill a blocked or
      // password-reset staff member's live sessions.
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService, MongooseModule],
})
export class StaffModule {}
