import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { envValidationSchema } from "./config/env.validation";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

// Infrastructure
import { EventsModule } from "./events/events.module";
import { AuditModule } from "./audit/audit.module";
import { StorageModule } from "./storage/storage.module";
import { CommsModule } from "./comms/comms.module";
import { HealthModule } from "./health/health.module";

// Feature modules
import { AuthModule } from "./auth/auth.module";
import { CustomersModule } from "./customers/customers.module";
import { PartnersModule } from "./partners/partners.module";
import { StaffModule } from "./staff/staff.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { ApplicationsModule } from "./applications/applications.module";
import { DocumentsModule } from "./documents/documents.module";
import { OffersModule } from "./offers/offers.module";
import { CommissionModule } from "./commission/commission.module";
import { MessagingModule } from "./messaging/messaging.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SupportModule } from "./support/support.module";
import { ContentModule } from "./content/content.module";
import { ToolsModule } from "./tools/tools.module";
import { MastersModule } from "./masters/masters.module";
import { GstModule } from "./gst/gst.module";
import { ReportsModule } from "./reports/reports.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI"),
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    // Infrastructure
    EventsModule,
    AuditModule,
    StorageModule,
    CommsModule,
    HealthModule,

    // Features
    AuthModule,
    CustomersModule,
    PartnersModule,
    StaffModule,
    CatalogueModule,
    ApplicationsModule,
    DocumentsModule,
    OffersModule,
    CommissionModule,
    MessagingModule,
    NotificationsModule,
    SupportModule,
    ContentModule,
    ToolsModule,
    MastersModule,
    GstModule,
    ReportsModule,
    AdminModule,
  ],
  providers: [
    // Every route requires a valid access token unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
