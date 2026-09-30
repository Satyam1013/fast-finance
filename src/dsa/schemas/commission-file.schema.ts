import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CommissionFileDocument = HydratedDocument<CommissionFile> & {
  createdAt: Date;
  updatedAt: Date;
};

/** DSA portal "Commission Chart" tab — Admin-uploaded rate sheets. */
@Schema({ timestamps: true, collection: "dsa_commission_files" })
export class CommissionFile {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  fileRef!: string;

  @Prop()
  mimeType?: string;
}

export const CommissionFileSchema =
  SchemaFactory.createForClass(CommissionFile);
