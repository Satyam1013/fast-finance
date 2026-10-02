import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  DsaResource,
  DsaResourceDocument,
  DsaResourceType,
} from "./schemas/dsa-resource.schema";
import { CibilLink, CibilLinkDocument } from "./schemas/cibil-link.schema";
import {
  CommissionFile,
  CommissionFileDocument,
} from "./schemas/commission-file.schema";
import {
  BankingLink,
  BankingLinkDocument,
} from "./schemas/banking-link.schema";
import { StorageService } from "../storage/storage.service";
import { PartnersService } from "../partners/partners.service";
import { toIdString } from "../common/util/id";
import type { UploadedFile } from "../common/util/upload";

@Injectable()
export class DsaContentService {
  constructor(
    @InjectModel(DsaResource.name)
    private readonly resources: Model<DsaResourceDocument>,
    @InjectModel(CibilLink.name)
    private readonly cibilLinks: Model<CibilLinkDocument>,
    @InjectModel(CommissionFile.name)
    private readonly commissionFiles: Model<CommissionFileDocument>,
    @InjectModel(BankingLink.name)
    private readonly bankingLinks: Model<BankingLinkDocument>,
    private readonly storage: StorageService,
    private readonly partners: PartnersService,
  ) {}

  // ── Learning resources ──

  async listResources() {
    const rows = await this.resources.find().sort({ createdAt: -1 }).lean();
    return rows.map((r) => ({
      id: toIdString(r._id),
      createdAt: r.createdAt,
      type: r.type,
      title: r.title,
      link: r.link ?? (r.fileRef ? this.storage.urlFor(r.fileRef) : null),
    }));
  }

  async createResource(
    dto: {
      type: DsaResourceType;
      title: string;
      link?: string;
    },
    file?: UploadedFile,
  ) {
    if (!dto.link && !file) {
      throw new BadRequestException({
        success: false,
        code: "LINK_OR_FILE_REQUIRED",
        message: "Provide either a link or a file.",
      });
    }
    const fileRef = file
      ? (await this.storage.save("admin/dsa/resources", file)).key
      : undefined;
    return this.resources.create({
      type: dto.type,
      title: dto.title,
      link: dto.link,
      fileRef,
    });
  }

  async removeResource(id: string) {
    if (!(await this.resources.findByIdAndDelete(id))) {
      throw new NotFoundException("Resource not found");
    }
    return { success: true };
  }

  // ── CIBIL links ──

  listCibilLinks() {
    return this.cibilLinks.find().sort({ createdAt: -1 }).lean();
  }

  createCibilLink(dto: { source: string; link: string }) {
    return this.cibilLinks.create(dto);
  }

  async removeCibilLink(id: string) {
    if (!(await this.cibilLinks.findByIdAndDelete(id))) {
      throw new NotFoundException("CIBIL link not found");
    }
    return { success: true };
  }

  // ── Commission chart files ──

  async listCommissionFiles() {
    const rows = await this.commissionFiles
      .find()
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((f) => ({
      id: toIdString(f._id),
      createdAt: f.createdAt,
      name: f.name,
      fileUrl: this.storage.urlFor(f.fileRef) ?? null,
    }));
  }

  async createCommissionFile(name: string, file: UploadedFile) {
    const saved = await this.storage.save("admin/dsa/commission", file);
    return this.commissionFiles.create({
      name,
      fileRef: saved.key,
      mimeType: file.mimetype,
    });
  }

  async removeCommissionFile(id: string) {
    const f = await this.commissionFiles.findByIdAndDelete(id);
    if (!f) throw new NotFoundException("Commission file not found");
    return { success: true };
  }

  async previewCommissionFile(id: string) {
    const f = await this.commissionFiles.findById(id).lean();
    if (!f) throw new NotFoundException("Commission file not found");
    return { success: true, fileUrl: this.storage.urlFor(f.fileRef) };
  }

  // ── Banking links ──
  // `password` is `select:false` on the schema — never returned here.

  listBankingLinks() {
    return this.bankingLinks.find().sort({ createdAt: -1 }).lean();
  }

  async createBankingLink(dto: {
    bank: string;
    link: string;
    rate?: string;
    accId?: string;
    password?: string;
  }) {
    const created = await this.bankingLinks.create(dto);
    // `password` is `select:false` on reads, but a freshly-created in-memory
    // document still carries it (`select:false` only suppresses queries) —
    // strip it explicitly so it never round-trips in the API response.
    const { password: _password, ...rest } = created.toObject();
    return rest;
  }

  async removeBankingLink(id: string) {
    if (!(await this.bankingLinks.findByIdAndDelete(id))) {
      throw new NotFoundException("Banking link not found");
    }
    return { success: true };
  }

  // ── Stats ──

  async stats() {
    const [dsaCounts, learning, cibil, commission, banking] = await Promise.all(
      [
        this.partners.counts(),
        this.resources.countDocuments(),
        this.cibilLinks.countDocuments(),
        this.commissionFiles.countDocuments(),
        this.bankingLinks.countDocuments(),
      ],
    );
    return {
      all: dsaCounts.all,
      blocked: dsaCounts.blocked,
      learning,
      cibil,
      commission,
      banking,
    };
  }
}
