import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CibilLinkDocument = HydratedDocument<CibilLink> & {
  createdAt: Date;
  updatedAt: Date;
};

/** DSA portal "CIBIL Links" tab — bureau-check links Admin curates for DSAs. */
@Schema({ timestamps: true, collection: "dsa_cibil_links" })
export class CibilLink {
  @Prop({ required: true, trim: true })
  source!: string;

  @Prop({ required: true, trim: true })
  link!: string;
}

export const CibilLinkSchema = SchemaFactory.createForClass(CibilLink);
