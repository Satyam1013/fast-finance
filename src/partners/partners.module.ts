import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { PartnersService } from "./partners.service";
import { PartnersController } from "./partners.controller";
import { Partner, PartnerSchema } from "./schemas/partner.schema";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Partner.name, schema: PartnerSchema }]),
  ],
  providers: [PartnersService],
  controllers: [PartnersController],
  exports: [PartnersService, MongooseModule],
})
export class PartnersModule {}
