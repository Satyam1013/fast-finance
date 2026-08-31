import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BannerDocument = HydratedDocument<Banner> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Home-screen promotional / cross-sell banner — FR-CUS-06 / PRD C (Could). */
@Schema({ timestamps: true, collection: "banners" })
export class Banner {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  subtitle?: string;

  /** Stored image key (served via /files/<key>). */
  @Prop({ required: true })
  imageRef!: string;

  @Prop({ trim: true })
  ctaLabel?: string;

  /** Deep link or URL the banner opens. */
  @Prop({ trim: true })
  ctaUrl?: string;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true, index: true })
  active!: boolean;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
