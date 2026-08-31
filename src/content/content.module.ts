import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ContentService } from "./content.service";
import { ContentController } from "./content.controller";
import { Banner, BannerSchema } from "./schemas/banner.schema";
import { GalleryItem, GalleryItemSchema } from "./schemas/gallery-item.schema";
import { Lender, LenderSchema } from "./schemas/lender.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Banner.name, schema: BannerSchema },
      { name: GalleryItem.name, schema: GalleryItemSchema },
      { name: Lender.name, schema: LenderSchema },
    ]),
  ],
  providers: [ContentService],
  controllers: [ContentController],
})
export class ContentModule {}
