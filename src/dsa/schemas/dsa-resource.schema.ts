import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type DsaResourceDocument = HydratedDocument<DsaResource> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum DsaResourceType {
  Video = "VIDEO",
  Document = "DOCUMENT",
}

/** DSA portal "Learning Resources" tab — content managed by Admin. */
@Schema({ timestamps: true, collection: "dsa_resources" })
export class DsaResource {
  @Prop({ type: String, enum: DsaResourceType, required: true })
  type!: DsaResourceType;

  @Prop({ required: true, trim: true })
  title!: string;

  /** External link (e.g. a YouTube video) — set instead of {@link fileRef}. */
  @Prop({ trim: true })
  link?: string;

  /** Uploaded document key (served via /files/<key>) — set instead of {@link link}. */
  @Prop()
  fileRef?: string;
}

export const DsaResourceSchema = SchemaFactory.createForClass(DsaResource);
