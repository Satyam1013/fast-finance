import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CatalogueService } from "./catalogue.service";
import { CatalogueController } from "./catalogue.controller";
import { Product, ProductSchema } from "./schemas/product.schema";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  providers: [CatalogueService],
  controllers: [CatalogueController],
  exports: [MongooseModule],
})
export class CatalogueModule {}
