import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Banner, BannerDocument } from "./schemas/banner.schema";
import {
  GalleryItem,
  GalleryItemDocument,
} from "./schemas/gallery-item.schema";
import { Lender, LenderDocument } from "./schemas/lender.schema";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Banner.name) private readonly banners: Model<BannerDocument>,
    @InjectModel(GalleryItem.name)
    private readonly gallery: Model<GalleryItemDocument>,
    @InjectModel(Lender.name) private readonly lenders: Model<LenderDocument>,
    private readonly storage: StorageService,
  ) {}

  /** FR-CUS-06 — live promotional banners for the Home carousel. */
  async activeBanners() {
    const now = new Date();
    const rows = await this.banners
      .find({
        active: true,
        $and: [
          {
            $or: [
              { startsAt: { $exists: false } },
              { startsAt: { $lte: now } },
            ],
          },
          { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
        ],
      })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return rows.map((b) => ({
      id: String(b._id),
      title: b.title,
      subtitle: b.subtitle ?? null,
      imageUrl: this.storage.urlFor(b.imageRef) ?? null,
      ctaLabel: b.ctaLabel ?? null,
      ctaUrl: b.ctaUrl ?? null,
    }));
  }

  async activeGallery() {
    const rows = await this.gallery
      .find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return rows.map((g) => ({
      id: String(g._id),
      caption: g.caption ?? null,
      imageUrl: this.storage.urlFor(g.imageRef) ?? null,
    }));
  }

  /** "Our Partnered NBFCs" grid. */
  async activeLenders() {
    const rows = await this.lenders
      .find({ active: true })
      .sort({ order: 1, name: 1 })
      .lean();
    return rows.map((l) => ({
      id: String(l._id),
      name: l.name,
      kind: l.kind,
      logoUrl: this.storage.urlFor(l.logoRef) ?? null,
      startingRate: l.startingRate ?? null,
    }));
  }

  /**
   * FR-CUS-05 — nearby partner banks/NBFCs for a pincode. Matches an exact
   * pincode first, then falls back to the same postal region (first 3 digits).
   * True distance ordering needs geocoding — a TODO.
   */
  async lendersByPincode(pincode: string) {
    const region = pincode.slice(0, 3);
    const rows = await this.lenders
      .find({ active: true, "branches.pincode": new RegExp(`^${region}`) })
      .lean();

    const results = rows.flatMap((l) =>
      l.branches
        .filter((b) => b.pincode.startsWith(region))
        .map((b) => ({
          lenderId: String(l._id),
          name: l.name,
          kind: l.kind,
          logoUrl: this.storage.urlFor(l.logoRef) ?? null,
          startingRate: l.startingRate ?? null,
          branch: b.label,
          address: b.address ?? null,
          city: b.city ?? null,
          state: b.state ?? null,
          pincode: b.pincode,
          phone: b.phone ?? null,
          exactPincode: b.pincode === pincode,
        })),
    );
    results.sort((a, b) => Number(b.exactPincode) - Number(a.exactPincode));
    return { success: true, pincode, count: results.length, results };
  }

  // ── Admin CRUD ──

  createBanner(dto: Partial<Banner>) {
    return this.banners.create(dto);
  }
  createGalleryItem(dto: Partial<GalleryItem>) {
    return this.gallery.create(dto);
  }
  createLender(dto: Partial<Lender>) {
    return this.lenders.create(dto);
  }

  async removeBanner(id: string) {
    if (!(await this.banners.findByIdAndDelete(id))) {
      throw new NotFoundException("Banner not found");
    }
    return { success: true };
  }
  async removeGalleryItem(id: string) {
    if (!(await this.gallery.findByIdAndDelete(id))) {
      throw new NotFoundException("Gallery item not found");
    }
    return { success: true };
  }
  async removeLender(id: string) {
    if (!(await this.lenders.findByIdAndDelete(id))) {
      throw new NotFoundException("Lender not found");
    }
    return { success: true };
  }
}
