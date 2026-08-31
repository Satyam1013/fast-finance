import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { Types } from "mongoose";
import { Customer, CustomerDocument } from "./schemas/customer.schema";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { StorageService } from "../storage/storage.service";
import { EMPLOYMENT_CATEGORY_LABELS } from "../common/constants";
import { maskAadhaar, maskPan } from "../common/util/mask";
import { toIdString } from "../common/util/id";
import { CreateProfileDto } from "./dto/create-profile.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

export interface ProfileUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
export interface ProfileFiles {
  photo?: ProfileUpload;
  aadhaarFront?: ProfileUpload;
  aadhaarBack?: ProfileUpload;
  panCard?: ProfileUpload;
}

/**
 * Customer records. Read access is SCOPED by role (FRS §2.2 customerRecords):
 *   Customer -> own   Partner -> own leads   Staff -> assigned   Admin -> all
 * Resolve the caller's scope with `scopeFor("customerRecords", role)` and
 * constrain every query — never trust an id from the URL (NFR-02, PRD §7).
 */
@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customers: Model<CustomerDocument>,
    private readonly storage: StorageService,
  ) {}

  findById(id: string) {
    return this.customers.findById(id).lean();
  }

  /** True once the mandatory Create-Profile fields are all present — gates FR-CUS-03. */
  async isProfileComplete(customerId: string): Promise<boolean> {
    const c = await this.customers.findById(customerId).lean();
    return Boolean(c?.profileCompletedAt);
  }

  /** FR-CUS-23 — Profile screen with masked Aadhaar/PAN. */
  async getOwnProfile(user: AuthUser) {
    const c = await this.customers.findById(user.sub).lean();
    if (!c) throw new NotFoundException("Customer not found");
    return { success: true, profile: this.present(c) };
  }

  /** Create Profile screen — FR-CUS-07. First-time capture; all fields mandatory. */
  async createProfile(
    user: AuthUser,
    dto: CreateProfileDto,
    files: ProfileFiles,
  ) {
    const missing = (
      ["photo", "aadhaarFront", "aadhaarBack", "panCard"] as const
    ).filter((f) => !files[f]);
    if (missing.length) {
      throw new BadRequestException({
        success: false,
        code: "PROFILE_FILES_MISSING",
        message: `Please upload: ${missing.join(", ")}`,
      });
    }

    const [photo, aadhaarFront, aadhaarBack, panCard] = await Promise.all([
      this.storage.save(`customers/${user.sub}`, files.photo!),
      this.storage.save(`customers/${user.sub}`, files.aadhaarFront!),
      this.storage.save(`customers/${user.sub}`, files.aadhaarBack!),
      this.storage.save(`customers/${user.sub}`, files.panCard!),
    ]);

    const c = await this.customers.findByIdAndUpdate(
      user.sub,
      {
        name: dto.fullName,
        email: dto.email,
        employmentCategory: dto.employmentCategory,
        state: dto.state,
        city: dto.city,
        photoRef: photo.key,
        aadhaarFrontRef: aadhaarFront.key,
        aadhaarBackRef: aadhaarBack.key,
        panCardRef: panCard.key,
        profileCompletedAt: new Date(),
      },
      { new: true },
    );
    if (!c) throw new NotFoundException("Customer not found");
    return { success: true, profile: this.present(c.toObject()) };
  }

  /** Edit Profile screen — partial update, optional new photo. */
  async updateOwnProfile(
    user: AuthUser,
    dto: UpdateProfileDto,
    files: ProfileFiles,
  ) {
    const update: Record<string, unknown> = {};
    if (dto.fullName !== undefined) update.name = dto.fullName;
    if (dto.email !== undefined) update.email = dto.email;
    if (dto.employmentCategory !== undefined)
      update.employmentCategory = dto.employmentCategory;
    if (dto.state !== undefined) update.state = dto.state;
    if (dto.city !== undefined) update.city = dto.city;
    if (files.photo) {
      const saved = await this.storage.save(
        `customers/${user.sub}`,
        files.photo,
      );
      update.photoRef = saved.key;
    }

    if (!Object.keys(update).length) {
      throw new BadRequestException({
        success: false,
        code: "NOTHING_TO_UPDATE",
        message: "Send at least one field to update.",
      });
    }

    const c = await this.customers.findByIdAndUpdate(user.sub, update, {
      new: true,
    });
    if (!c) throw new NotFoundException("Customer not found");
    return { success: true, profile: this.present(c.toObject()) };
  }

  /** FR-ADM-04/05, FR-STF-01/03 — list/get with role scoping applied by caller. */
  adminList(_query: unknown) {
    // TODO(FR-ADM-04, FR-ADM-09): paginated search across all customers.
    return this.customers
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .then((rows) => rows.map((c) => this.present(c)));
  }

  /** Shape a customer document for the API — masked KYC, resolved file URLs. */
  private present(
    c: Customer & { _id?: Types.ObjectId | string; createdAt?: Date },
  ) {
    return {
      id: toIdString(c._id),
      fullName: c.name || null,
      mobile: c.mobile,
      email: c.email ?? null,
      dob: c.dob ?? null,
      employmentCategory: c.employmentCategory ?? null,
      employmentCategoryLabel: c.employmentCategory
        ? EMPLOYMENT_CATEGORY_LABELS[c.employmentCategory]
        : null,
      state: c.state ?? null,
      city: c.city ?? null,
      pincode: c.pincode ?? null,
      photoUrl: this.storage.urlFor(c.photoRef) ?? null,
      kyc: {
        aadhaarMasked: maskAadhaar(c.aadhaar) ?? null,
        panMasked: maskPan(c.pan) ?? null,
        aadhaarFrontUrl: this.storage.urlFor(c.aadhaarFrontRef) ?? null,
        aadhaarBackUrl: this.storage.urlFor(c.aadhaarBackRef) ?? null,
        panCardUrl: this.storage.urlFor(c.panCardRef) ?? null,
      },
      profileComplete: Boolean(c.profileCompletedAt),
      createdAt: c.createdAt ?? null,
    };
  }
}
