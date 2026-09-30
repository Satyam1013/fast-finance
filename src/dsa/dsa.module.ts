import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DsaContentService } from "./dsa-content.service";
import { DsaContentController } from "./dsa-content.controller";
import { DsaResource, DsaResourceSchema } from "./schemas/dsa-resource.schema";
import { CibilLink, CibilLinkSchema } from "./schemas/cibil-link.schema";
import {
  CommissionFile,
  CommissionFileSchema,
} from "./schemas/commission-file.schema";
import { BankingLink, BankingLinkSchema } from "./schemas/banking-link.schema";
import { PartnersModule } from "../partners/partners.module";

@Module({
  imports: [
    PartnersModule,
    MongooseModule.forFeature([
      { name: DsaResource.name, schema: DsaResourceSchema },
      { name: CibilLink.name, schema: CibilLinkSchema },
      { name: CommissionFile.name, schema: CommissionFileSchema },
      { name: BankingLink.name, schema: BankingLinkSchema },
    ]),
  ],
  providers: [DsaContentService],
  controllers: [DsaContentController],
})
export class DsaModule {}
