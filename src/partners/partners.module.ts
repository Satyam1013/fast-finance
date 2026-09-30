import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { PartnersService } from "./partners.service";
import { PartnersController } from "./partners.controller";
import { Partner, PartnerSchema } from "./schemas/partner.schema";
import {
  Application,
  ApplicationSchema,
} from "../applications/schemas/application.schema";
import {
  RefreshToken,
  RefreshTokenSchema,
} from "../auth/schemas/refresh-token.schema";
import { StaffModule } from "../staff/staff.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    StaffModule,
    MongooseModule.forFeature([
      { name: Partner.name, schema: PartnerSchema },
      // Read-only — same model as ApplicationsModule, no module cycle (mirrors
      // MessagingModule/DocumentsModule/OffersModule; see CLAUDE.md).
      { name: Application.name, schema: ApplicationSchema },
      // Read/write — same model as AuthModule; kills a blocked DSA's sessions.
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [PartnersService],
  controllers: [PartnersController],
  exports: [PartnersService, MongooseModule],
})
export class PartnersModule {}
