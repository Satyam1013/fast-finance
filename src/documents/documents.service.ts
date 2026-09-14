import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  DocumentEntity,
  DocumentEntityDocument,
} from "./schemas/document.schema";
import {
  BankStatementMethod,
  DOCUMENT_LABELS,
  DocumentStatus,
  DocumentType,
  MANDATORY_DOCUMENTS,
  AuditAction,
} from "../common/constants";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { StorageService } from "../storage/storage.service";
import { AuditService } from "../audit/audit.service";
import type { UploadedFile } from "../common/util/upload";

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documents: Model<DocumentEntityDocument>,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Seed the mandatory checklist as PENDING rows when an application is created. */
  async seedChecklist(applicationId: string): Promise<void> {
    await this.documents.bulkWrite(
      MANDATORY_DOCUMENTS.map((type) => ({
        updateOne: {
          filter: { applicationId, type },
          update: { $setOnInsert: { status: DocumentStatus.Pending } },
          upsert: true,
        },
      })),
    );
  }

  /** FR-CUS-09 — checklist with per-item status + resolved file URL. */
  async checklistView(applicationId: string) {
    const rows = await this.documents.find({ applicationId }).lean();
    const byType = new Map(rows.map((r) => [r.type, r]));
    return MANDATORY_DOCUMENTS.map((type) => {
      const r = byType.get(type);
      return {
        type,
        label: DOCUMENT_LABELS[type],
        status: r?.status ?? DocumentStatus.Pending,
        fileUrl: this.storage.urlFor(r?.fileRef) ?? null,
        submissionMethod: r?.submissionMethod ?? null,
        rejectionNote: r?.rejectionNote ?? null,
        verifiedAt: r?.verifiedAt ?? null,
        updatedAt: r?.updatedAt ?? null,
      };
    });
  }

  /** Raw rows — kept for callers that need the documents directly. */
  checklist(applicationId: string) {
    return this.documents.find({ applicationId }).lean();
  }

  /** True when every mandatory document is Submitted/Verified — gates FR-CUS-13. */
  async allMandatorySubmitted(applicationId: string): Promise<boolean> {
    return (await this.pendingMandatory(applicationId)).length === 0;
  }

  /** Labels of the mandatory documents not yet Submitted/Verified. */
  async pendingMandatory(applicationId: string): Promise<string[]> {
    const rows = await this.documents
      .find({ applicationId, type: { $in: MANDATORY_DOCUMENTS } })
      .lean();
    const ok = new Set(
      rows
        .filter(
          (d) =>
            d.status === DocumentStatus.Submitted ||
            d.status === DocumentStatus.Verified,
        )
        .map((d) => d.type),
    );
    return MANDATORY_DOCUMENTS.filter((t) => !ok.has(t)).map(
      (t) => DOCUMENT_LABELS[t],
    );
  }

  /** Pending-mandatory count per application id — for the FR-CUS-19 prompt. */
  async pendingCountByApplication(
    applicationIds: string[],
  ): Promise<Map<string, number>> {
    if (!applicationIds.length) return new Map();
    const rows = await this.documents
      .find({
        applicationId: { $in: applicationIds },
        type: { $in: MANDATORY_DOCUMENTS },
      })
      .lean();
    const counts = new Map<string, number>();
    for (const id of applicationIds) counts.set(id, MANDATORY_DOCUMENTS.length);
    for (const d of rows) {
      if (
        d.status === DocumentStatus.Submitted ||
        d.status === DocumentStatus.Verified
      ) {
        counts.set(d.applicationId, (counts.get(d.applicationId) ?? 1) - 1);
      }
    }
    return counts;
  }

  /** FR-CUS-10 — upload PAN/Aadhaar/Selfie/Address/SalarySlip for an application. */
  async upload(
    applicationId: string,
    type: DocumentType,
    file: UploadedFile | undefined,
  ) {
    if (type === DocumentType.BankStatement) {
      throw new BadRequestException({
        success: false,
        code: "USE_BANK_ENDPOINT",
        message:
          "Submit the bank statement via the AA or manual bank endpoint.",
      });
    }
    if (!file) {
      throw new BadRequestException({
        success: false,
        code: "FILE_REQUIRED",
        message: "Attach the document file.",
      });
    }
    const saved = await this.storage.save(`documents/${applicationId}`, file);
    const doc = await this.documents.findOneAndUpdate(
      { applicationId, type },
      {
        fileRef: saved.key,
        status: DocumentStatus.Submitted,
        $unset: { rejectionNote: "", verifiedBy: "", verifiedAt: "" },
      },
      { new: true, upsert: true },
    );
    return {
      success: true,
      document: {
        type,
        label: DOCUMENT_LABELS[type],
        status: doc.status,
        fileUrl: saved.url,
      },
    };
  }

  /**
   * FR-CUS-11/12 — manual bank details. Validate accountNumber ===
   * reEnteredAccountNumber BEFORE persisting; store only accountNumber + ifsc.
   */
  async submitManualBank(
    applicationId: string,
    dto: {
      accountNumber: string;
      reEnteredAccountNumber: string;
      ifsc: string;
    },
  ) {
    if (dto.accountNumber !== dto.reEnteredAccountNumber) {
      throw new BadRequestException({
        success: false,
        code: "ACCOUNT_MISMATCH",
        message: "Account numbers do not match.",
      });
    }
    const doc = await this.documents.findOneAndUpdate(
      { applicationId, type: DocumentType.BankStatement },
      {
        status: DocumentStatus.Submitted,
        submissionMethod: BankStatementMethod.Manual,
        manualBankDetails: {
          accountNumber: dto.accountNumber,
          ifsc: dto.ifsc.toUpperCase().trim(),
        },
        $unset: { rejectionNote: "" },
      },
      { new: true, upsert: true },
    );
    return {
      success: true,
      document: {
        type: DocumentType.BankStatement,
        label: DOCUMENT_LABELS[DocumentType.BankStatement],
        status: doc.status,
        submissionMethod: doc.submissionMethod,
      },
    };
  }

  /**
   * Remove an uploaded document (or manual bank entry), resetting the
   * checklist item back to PENDING. Blocked once staff has verified it —
   * a verified item is corrected via re-upload + re-review, not deletion.
   */
  async remove(applicationId: string, type: DocumentType) {
    const doc = await this.documents.findOne({ applicationId, type });
    if (!doc || doc.status === DocumentStatus.Pending) {
      throw new NotFoundException("Document not found");
    }
    if (doc.status === DocumentStatus.Verified) {
      throw new BadRequestException({
        success: false,
        code: "DOCUMENT_VERIFIED",
        message: "A verified document cannot be removed.",
      });
    }
    if (doc.fileRef) await this.storage.delete(doc.fileRef);

    await this.documents.updateOne(
      { _id: doc._id },
      {
        status: DocumentStatus.Pending,
        $unset: {
          fileRef: "",
          submissionMethod: "",
          manualBankDetails: "",
          rejectionNote: "",
          verifiedBy: "",
          verifiedAt: "",
        },
      },
    );
    return { success: true };
  }

  /**
   * FR-CUS-11 — Account Aggregator OTP path. Feature-flagged
   * (FEATURE_ACCOUNT_AGGREGATOR); manual entry is the supported fallback
   * until AA registration completes (FRS §10.2, PRD sequencing note).
   */
  startAaFlow(_applicationId: string): never {
    throw new BadRequestException({
      success: false,
      code: "AA_DISABLED",
      message:
        "Account Aggregator is not enabled yet. Use manual bank entry instead.",
    });
  }

  /** FR-STF-08 / PRD S-03 — staff marks a document Verified or Rejected(+note). */
  async review(
    documentId: string,
    decision: "verify" | "reject",
    note: string | undefined,
    staff: AuthUser,
  ) {
    const doc = await this.documents.findById(documentId);
    if (!doc) throw new NotFoundException("Document not found");

    if (decision === "reject" && !note?.trim()) {
      throw new BadRequestException({
        success: false,
        code: "NOTE_REQUIRED",
        message: "A note is required when rejecting a document.",
      });
    }

    doc.status =
      decision === "verify" ? DocumentStatus.Verified : DocumentStatus.Rejected;
    doc.verifiedBy = staff.sub;
    doc.verifiedAt = new Date();
    doc.rejectionNote = decision === "reject" ? note?.trim() : undefined;
    await doc.save();

    await this.audit.record({
      action:
        decision === "verify"
          ? AuditAction.DocumentVerified
          : AuditAction.DocumentRejected,
      targetId: doc.applicationId,
      targetType: "Document",
      actorId: staff.sub,
      actorRole: staff.role,
      actorName: staff.name,
      reason: doc.rejectionNote,
    });

    // TODO(FR-STF-08): fan a "document.updated" event + customer notification to
    // [customer, staff, partner]. Needs the application's audience — wire when
    // the applications ⇄ documents boundary is settled (currently one-way).

    return {
      success: true,
      document: {
        id: doc.id,
        type: doc.type,
        status: doc.status,
        rejectionNote: doc.rejectionNote ?? null,
      },
    };
  }
}
