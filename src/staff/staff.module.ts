import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { StaffService } from "./staff.service";
import { StaffController } from "./staff.controller";
import { Staff, StaffSchema } from "./schemas/staff.schema";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Staff.name, schema: StaffSchema }]),
  ],
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService, MongooseModule],
})
export class StaffModule {}
