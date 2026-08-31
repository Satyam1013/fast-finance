import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommissionService } from "./commission.service";
import { CommissionController } from "./commission.controller";
import { Commission, CommissionSchema } from "./schemas/commission.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commission.name, schema: CommissionSchema },
    ]),
  ],
  providers: [CommissionService],
  controllers: [CommissionController],
  exports: [CommissionService, MongooseModule],
})
export class CommissionModule {}
