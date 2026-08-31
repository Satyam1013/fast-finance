import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { GstService } from "./gst.service";
import { GstController } from "./gst.controller";
import { GstRecord, GstRecordSchema } from "./schemas/gst-record.schema";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: GstRecord.name, schema: GstRecordSchema },
    ]),
  ],
  providers: [GstService],
  controllers: [GstController],
  exports: [GstService],
})
export class GstModule {}
