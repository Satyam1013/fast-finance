import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  DocumentEntity,
  DocumentEntityDocument,
} from "./schemas/document.schema";
import { DocumentStatus, MANDATORY_DOCUMENTS } from "../common/constants";
import type { AuthUser } from "../common/interfaces/authenticated-request";

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documents: Model<DocumentEntityDocument>,
  ) {}

  /** FR-CUS-09 — checklist with per-item status for an application. */
  checklist(applicationId: string) {
    return this.documents.find({ applicationId }).lean();
  }

  /** True when every mandatory document is Submitted/Verified — gates FR-CUS-13. */
  async allMandatorySubmitted(applicationId: string): Promise<boolean> {
    const docs = await this.documents
      .find({ applicationId, type: { $in: MANDATORY_DOCUMENTS } })
      .lean();
    if (docs.length < MANDATORY_DOCUMENTS.length) return false;
    return docs.every(
      (d) =>
        d.status === DocumentStatus.Submitted ||
        d.status === DocumentStatus.Verified,
    );
  }

  /** FR-CUS-10 — upload PAN/Aadhaar/Selfie/Address/SalarySlip. */
  upload(_applicationId: string, _dto: unknown): Promise<never> {
    // TODO: store file (S3/local), set fileRef + status = SUBMITTED.
    throw new NotImplementedException("documents.upload — not built");
  }

  /**
   * FR-CUS-11/12 — manual bank details. Validate accountNumber ===
   * reEnteredAccountNumber BEFORE persisting; store only accountNumber + ifsc.
   */
  submitManualBank(
    _applicationId: string,
    dto: {
      accountNumber: string;
      reEnteredAccountNumber: string;
      ifsc: string;
    },
  ): Promise<never> {
    if (dto.accountNumber !== dto.reEnteredAccountNumber) {
      throw new BadRequestException({
        success: false,
        code: "ACCOUNT_MISMATCH",
        message: "Account numbers do not match.",
      });
    }
    // TODO: upsert BankStatement doc with method = MANUAL.
    throw new NotImplementedException("documents.submitManualBank — not built");
  }

  /**
   * FR-CUS-11 — Account Aggregator OTP path. Feature-flagged
   * (FEATURE_ACCOUNT_AGGREGATOR); manual entry is the supported fallback
   * until AA registration completes (FRS §10.2, PRD sequencing note).
   */
  startAaFlow(_applicationId: string): Promise<never> {
    throw new NotImplementedException(
      "documents.startAaFlow — feature flagged off",
    );
  }

  /** FR-STF-08 / PRD S-03 — staff marks a document Verified or Rejected(+note). */
  review(
    _documentId: string,
    _decision: "verify" | "reject",
    _note: string | undefined,
    _staff: AuthUser,
  ): Promise<never> {
    throw new NotImplementedException("documents.review — not built");
  }
}
