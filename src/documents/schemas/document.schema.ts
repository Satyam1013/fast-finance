import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
  BankStatementMethod,
  DocumentStatus,
  DocumentType,
} from "../../common/constants";

export type DocumentEntityDocument = HydratedDocument<DocumentEntity> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Manual bank-detail capture — FR-CUS-11/12. */
@Schema({ _id: false })
export class ManualBankDetails {
  @Prop({ required: true }) accountNumber!: string;
  @Prop({ required: true }) ifsc!: string;
  // accountNumber === reEnteredAccountNumber is validated in the service
  // BEFORE persist (FR-CUS-12); the re-entry itself is not stored.
}
const ManualBankDetailsSchema = SchemaFactory.createForClass(ManualBankDetails);

/**
 * Document — FRS §9.2. One checklist item per application. Named `DocumentEntity`
 * to avoid clashing with the DOM `Document` global.
 */
@Schema({ timestamps: true, collection: "documents" })
export class DocumentEntity {
  @Prop({ required: true, index: true })
  applicationId!: string;

  @Prop({ type: String, enum: DocumentType, required: true })
  type!: DocumentType;

  @Prop({ type: String, enum: DocumentStatus, default: DocumentStatus.Pending })
  status!: DocumentStatus;

  /** Storage reference / key for the uploaded file (S3 key or local path). */
  @Prop()
  fileRef?: string;

  // ── Bank statement only ──
  @Prop({ type: String, enum: BankStatementMethod })
  submissionMethod?: BankStatementMethod;

  @Prop({ type: ManualBankDetailsSchema })
  manualBankDetails?: ManualBankDetails;

  // ── Verification — FR-STF-08 / PRD S-03 ──
  @Prop()
  verifiedBy?: string; // staff _id

  @Prop()
  verifiedAt?: Date;

  /** Shown to the customer when status === REJECTED — PRD S-03. */
  @Prop()
  rejectionNote?: string;
}

export const DocumentEntitySchema =
  SchemaFactory.createForClass(DocumentEntity);
DocumentEntitySchema.index({ applicationId: 1, type: 1 }, { unique: true });
