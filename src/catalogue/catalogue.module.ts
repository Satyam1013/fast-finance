import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CatalogueService } from "./catalogue.service";
import { CatalogueController } from "./catalogue.controller";
import { Product, ProductSchema } from "./schemas/product.schema";
import {
  Application,
  ApplicationSchema,
} from "../applications/schemas/application.schema";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      // Read-only — importing ApplicationsModule would cycle back (it already
      // imports CatalogueModule); see CLAUDE.md. Only used to refuse deleting
      // a product that already has applications against it.
      { name: Application.name, schema: ApplicationSchema },
    ]),
  ],
  providers: [CatalogueService],
  controllers: [CatalogueController],
  exports: [MongooseModule],
})
export class CatalogueModule {}
