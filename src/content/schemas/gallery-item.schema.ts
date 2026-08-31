import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type GalleryItemDocument = HydratedDocument<GalleryItem> & {
  createdAt: Date;
  updatedAt: Date;
};

/** "Our Gallery" tile on the Home screen. */
@Schema({ timestamps: true, collection: "gallery_items" })
export class GalleryItem {
  /** Stored image key (served via /files/<key>). */
  @Prop({ required: true })
  imageRef!: string;

  @Prop({ trim: true })
  caption?: string;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true, index: true })
  active!: boolean;
}

export const GalleryItemSchema = SchemaFactory.createForClass(GalleryItem);
