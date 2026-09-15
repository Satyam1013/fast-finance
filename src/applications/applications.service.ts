import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Application, ApplicationDocument } from "./schemas/application.schema";
import { Product, ProductDocument } from "../catalogue/schemas/product.schema";
import { EventsService } from "../events/events.service";
import { AuditService } from "../audit/audit.service";
import { DocumentsService } from "../documents/documents.service";
import { MessagingService } from "../messaging/messaging.service";
import { CustomersService } from "../customers/customers.service";
import { StaffService } from "../staff/staff.service";
import { StorageService } from "../storage/storage.service";
import { OffersService } from "../offers/offers.service";
import { OfferStatus } from "../offers/schemas/loan-offer.schema";
import {
  AuditAction,
  buildStageTracker,
  DocumentStatus,
  employmentTypeFor,
  FINAL_STAGE,
  FIRST_STAGE,
  LeadStatus,
  nextStage,
  Role,
  Stage,
  STAGE_LABELS,
  STAGE_SHORT_LABELS,
  STAGE_CUSTOMER_MESSAGE,
} from "../common/constants";
import { toIdString } from "../common/util/id";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import type { Types } from "mongoose";

type ApplicationLean = Application & {
  _id?: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    @InjectModel(Product.name)
    private readonly products: Model<ProductDocument>,
    private readonly events: EventsService,
    private readonly audit: AuditService,
    private readonly documents: DocumentsService,
    private readonly messaging: MessagingService,
    private readonly customers: CustomersService,
    private readonly staff: StaffService,
    private readonly storage: StorageService,
    private readonly offers: OffersService,
  ) {}

  /** FR-CUS-08 — human-readable id, e.g. FF-PL-260712-0091. */
  private async newApplicationId(code: string): Promise<string> {
    const d = new Date();
    const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    for (let attempt = 0; attempt < 5; attempt++) {
      const todayCount = await this.applications.countDocuments({
        applicationId: new RegExp(`^FF-${code}-${yymmdd}-`),
        createdAt: { $gte: start },
      });
      const serial = String(todayCount + 1 + attempt).padStart(4, "0");
      const candidate = `FF-${code}-${yymmdd}-${serial}`;
      if (!(await this.applications.exists({ applicationId: candidate }))) {
        return candidate;
      }
    }
    return `FF-${code}-${yymmdd}-${String(Date.now()).slice(-4)}`;
  }

  /** Least-loaded active staff member — FR-PTR-12 / Journey B step 6. */
  private async pickAssignee(): Promise<string> {
    const assignable = await this.staff.listAssignable();
    if (!assignable.length) {
      throw new BadRequestException({
        success: false,
        code: "NO_STAFF_AVAILABLE",
        message: "No staff member is available to handle this application yet.",
      });
    }
    const ids = assignable.map((s) => String(s._id));
    const open = await this.applications.aggregate<{ _id: string; n: number }>([
      { $match: { staffId: { $in: ids }, locked: false, isRejected: false } },
      { $group: { _id: "$staffId", n: { $sum: 1 } } },
    ]);
    const load = new Map(open.map((o) => [o._id, o.n]));
    ids.sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0));
    return ids[0];
  }

  /**
   * FR-CUS-03/04 + §10.1 duplicate prevention. Requires a complete profile
   * (FR-CUS-07). If an un-rejected stage-1 application already exists for the
   * same customer + product, that one is returned instead of a duplicate.
   */
  async startOrResume(customerId: string, productId: string) {
    if (!(await this.customers.isProfileComplete(customerId))) {
      throw new BadRequestException({
        success: false,
        code: "PROFILE_INCOMPLETE",
        message: "Complete your profile before starting an application.",
      });
    }

    const product = await this.products.findById(productId).lean();
    if (!product || !product.active) {
      throw new BadRequestException({
        success: false,
        code: "PRODUCT_UNAVAILABLE",
        message: "This product is not available right now.",
      });
    }

    const existing = await this.applications.findOne({
      customerId,
      productId,
      stage: FIRST_STAGE,
      isRejected: false,
    });
    if (existing) return this.detail(existing);

    const customer = await this.customers.findById(customerId);
    if (!customer) throw new NotFoundException("Customer not found");

    const staffId = await this.pickAssignee();
    const applicationId = await this.newApplicationId(product.code);

    const app = await this.applications.create({
      applicationId,
      customerId,
      productId,
      productName: product.name,
      productImageRef: product.imageRef,
      productCode: product.code,
      stage: FIRST_STAGE,
      staffId,
      profile: {
        fullName: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        employmentType: employmentTypeFor(customer.employmentCategory),
      },
    });

    await this.documents.seedChecklist(app.id);

    await this.audit.record({
      action: AuditAction.StageAdvanced,
      targetId: app.id,
      targetType: "Application",
      actorId: customerId,
      actorRole: Role.Customer,
      actorName: customer.name,
      after: { stage: FIRST_STAGE, applicationId },
    });

    return this.detail(app);
  }

  /**
   * FR-CUS-13 / PRD C-08 — final submission. Rejected at the API layer (not
   * only the UI) until every mandatory document is at least Submitted. On
   * success the application advances from stage 1 to stage 2.
   */
  async submit(applicationId: string, user: AuthUser) {
    const app = await this.applications.findById(applicationId);
    if (!app || app.customerId !== user.sub) {
      throw new NotFoundException("Application not found");
    }
    if (app.isRejected || app.locked) {
      throw new ForbiddenException("This application can no longer be changed");
    }
    if (app.stage !== FIRST_STAGE) {
      throw new BadRequestException({
        success: false,
        code: "ALREADY_SUBMITTED",
        message: "This application has already been submitted.",
      });
    }

    const pending = await this.documents.pendingMandatory(applicationId);
    if (pending.length) {
      throw new BadRequestException({
        success: false,
        code: "DOCUMENTS_PENDING",
        message: `Upload the pending documents first: ${pending.join(", ")}`,
        errors: pending,
      });
    }

    app.submittedAt = new Date();
    await this.applyStageChange(app, FIRST_STAGE, nextStage(FIRST_STAGE), user);
    return this.detail(app);
  }

  /**
   * Customer accepts the pending Loan Offer — advances Stage 3 -> 4 and
   * records the sanctioned amount onto the application (PRD §6, Stage 3).
   */
  async acceptOffer(applicationId: string, user: AuthUser) {
    const app = await this.applications.findById(applicationId);
    if (!app || app.customerId !== user.sub) {
      throw new NotFoundException("Application not found");
    }
    if (app.stage !== Stage.LoanOffer) {
      throw new BadRequestException({
        success: false,
        code: "NOT_AT_OFFER_STAGE",
        message: "This application is not at the Loan Offer stage.",
      });
    }
    if (app.isRejected || app.locked) {
      throw new ForbiddenException("This application can no longer be changed");
    }

    const offer = await this.offers.findPendingOrThrow(applicationId);
    app.loanAmount = offer.loanAmount;
    await this.offers.markResponded(applicationId, OfferStatus.Accepted);
    await this.audit.record({
      action: AuditAction.OfferAccepted,
      targetId: applicationId,
      targetType: "Application",
      actorId: user.sub,
      actorRole: user.role,
      actorName: user.name,
    });
    await this.applyStageChange(
      app,
      Stage.LoanOffer,
      nextStage(Stage.LoanOffer),
      user,
    );
    return this.detail(app);
  }

  /**
   * Customer declines the pending Loan Offer — the application itself is
   * rejected (declining sanctioned terms ends the journey, §3.1).
   */
  async rejectOffer(applicationId: string, user: AuthUser, note?: string) {
    const app = await this.applications.findById(applicationId);
    if (!app || app.customerId !== user.sub) {
      throw new NotFoundException("Application not found");
    }
    if (app.stage !== Stage.LoanOffer) {
      throw new BadRequestException({
        success: false,
        code: "NOT_AT_OFFER_STAGE",
        message: "This application is not at the Loan Offer stage.",
      });
    }

    await this.offers.findPendingOrThrow(applicationId);
    await this.offers.markResponded(applicationId, OfferStatus.Rejected, note);
    await this.audit.record({
      action: AuditAction.OfferRejected,
      targetId: applicationId,
      targetType: "Application",
      actorId: user.sub,
      actorRole: user.role,
      actorName: user.name,
      reason: note,
    });
    return this.reject(
      applicationId,
      note?.trim() || "Customer declined the loan offer.",
      user,
    );
  }

  /**
   * FR-STF-09/10, PRD §6.1 — advance ONE stage (assigned staff or admin).
   */
  async advanceStage(applicationId: string, actor: AuthUser) {
    const app = await this.applications.findById(applicationId);
    if (!app) throw new NotFoundException("Application not found");
    if (app.locked || app.isRejected) {
      throw new ForbiddenException("This application can no longer be changed");
    }
    if (app.stage >= FINAL_STAGE) {
      throw new BadRequestException(
        "Application is already at the final stage",
      );
    }
    if (actor.role === Role.Staff && app.staffId !== actor.sub) {
      throw new ForbiddenException("This application is not assigned to you");
    }

    const from = app.stage;
    await this.applyStageChange(app, from, nextStage(from), actor);
    return this.detail(app);
  }

  /** Admin-only backward correction — every move logged (PRD §6.1 / A-03). */
  async revertStage(applicationId: string, actor: AuthUser) {
    const app = await this.applications.findById(applicationId);
    if (!app) throw new NotFoundException("Application not found");
    if (app.stage <= FIRST_STAGE) {
      throw new BadRequestException(
        "Application is already at the first stage",
      );
    }
    const from = app.stage;
    const to = (from - 1) as Stage;

    app.stage = to;
    app.locked = false;
    await app.save();

    const audience = this.audienceFor(app);
    await this.messaging.postSystem(
      app.id,
      `An administrator moved this application back to "${STAGE_LABELS[to]}".`,
      audience,
    );
    await this.audit.record({
      action: AuditAction.StageReverted,
      targetId: app.id,
      targetType: "Application",
      actorId: actor.sub,
      actorRole: actor.role,
      actorName: actor.name,
      before: { stage: from },
      after: { stage: to },
    });
    this.events.publish({
      audience,
      type: "stage.changed",
      applicationId: app.id,
      payload: { from, to, message: STAGE_CUSTOMER_MESSAGE[to] },
    });
    return this.detail(app);
  }

  /** Reject from any stage with a mandatory reason (§3.1 / PRD §6.1). */
  async reject(applicationId: string, reason: string, actor: AuthUser) {
    const app = await this.applications.findById(applicationId);
    if (!app) throw new NotFoundException("Application not found");
    if (app.isRejected) {
      throw new BadRequestException("Application is already rejected");
    }
    if (actor.role === Role.Staff && app.staffId !== actor.sub) {
      throw new ForbiddenException("This application is not assigned to you");
    }

    app.isRejected = true;
    app.rejectionReason = reason;
    app.rejectedAt = new Date();
    await app.save();

    const audience = this.audienceFor(app);
    await this.messaging.postSystem(
      app.id,
      `This application was not approved. Reason: ${reason}`,
      audience,
    );
    await this.audit.record({
      action: AuditAction.ApplicationRejected,
      targetId: app.id,
      targetType: "Application",
      actorId: actor.sub,
      actorRole: actor.role,
      actorName: actor.name,
      reason,
      after: { stage: app.stage, isRejected: true },
    });
    this.events.publish({
      audience,
      type: "application.rejected",
      applicationId: app.id,
      customerId: app.customerId,
      payload: {
        stage: app.stage,
        reason,
        applicationRef: app.applicationId,
        productName: app.productName,
      },
    });
    return this.detail(app);
  }

  /** FR-CUS-15/16/18 — the caller's applications, scoped by role. */
  async listForCaller(user: AuthUser) {
    const apps = await this.applications
      .find(this.scopeQuery(user))
      .sort({ createdAt: -1 })
      .lean();

    const pendingCounts = await this.documents.pendingCountByApplication(
      apps.filter((a) => a.stage === FIRST_STAGE).map((a) => String(a._id)),
    );

    return {
      success: true,
      applications: apps.map((a) =>
        this.listItem(a, pendingCounts.get(String(a._id)) ?? 0),
      ),
    };
  }

  /** FR-CUS-15/16/20 — one application with the full 7-stage tracker. */
  async getForCaller(applicationId: string, user: AuthUser) {
    const app = await this.applications.findById(applicationId);
    if (!app || !this.callerCanSee(app, user)) {
      throw new NotFoundException("Application not found");
    }
    return this.detail(app);
  }

  // ───────────────────────────── internals ────────────────────────────────

  /** One stage transition + its side effects (FRS §10.1). */
  private async applyStageChange(
    app: ApplicationDocument,
    from: Stage,
    to: Stage,
    actor: AuthUser,
  ): Promise<void> {
    // TODO: wrap the save + side effects in a Mongo session/transaction.
    app.stage = to;
    if (to === Stage.Disbursed) app.locked = true;
    await app.save();

    const audience = this.audienceFor(app);
    const message = STAGE_CUSTOMER_MESSAGE[to];

    await this.messaging.postSystem(app.id, message, audience);
    await this.audit.record({
      action: AuditAction.StageAdvanced,
      targetId: app.id,
      targetType: "Application",
      actorId: actor.sub,
      actorRole: actor.role,
      actorName: actor.name,
      before: { stage: from },
      after: { stage: to },
    });
    this.events.publish({
      audience,
      type: "stage.changed",
      applicationId: app.id,
      customerId: app.customerId,
      payload: {
        from,
        to,
        message,
        stageLabel: STAGE_LABELS[to],
        applicationRef: app.applicationId,
        productName: app.productName,
      },
    });

    // TODO(FR-PTR-22): if (to === FINAL_STAGE && app.partnerId)
    //   commission.calculateFor(app, product) — inside the same transaction.
  }

  private audienceFor(app: ApplicationDocument): string[] {
    const a = [app.customerId, app.staffId];
    if (app.partnerId) a.push(app.partnerId);
    return a;
  }

  private scopeQuery(user: AuthUser): Record<string, unknown> {
    switch (user.role) {
      case Role.Customer:
        return { customerId: user.sub };
      case Role.Partner:
        return { partnerId: user.sub };
      case Role.Staff:
        return { staffId: user.sub };
      case Role.Admin:
        return {};
      default:
        return { _id: null };
    }
  }

  private callerCanSee(app: ApplicationDocument, user: AuthUser): boolean {
    switch (user.role) {
      case Role.Customer:
        return app.customerId === user.sub;
      case Role.Partner:
        return app.partnerId === user.sub;
      case Role.Staff:
        return app.staffId === user.sub;
      case Role.Admin:
        return true;
      default:
        return false;
    }
  }

  private statusBucket(app: {
    isRejected: boolean;
    stage: number;
  }): LeadStatus {
    if (app.isRejected) return LeadStatus.Rejected;
    if (app.stage >= FINAL_STAGE) return LeadStatus.Disbursed;
    return LeadStatus.InProgress;
  }

  private listItem(a: ApplicationLean, pendingDocumentCount: number) {
    const bucket = this.statusBucket(a);
    return {
      id: toIdString(a._id),
      applicationId: a.applicationId,
      productId: a.productId,
      productName: a.productName,
      productImageUrl: this.storage.urlFor(a.productImageRef) ?? null,
      stage: a.stage,
      step: a.stage,
      totalSteps: FINAL_STAGE,
      stageLabel: STAGE_LABELS[a.stage as Stage],
      stageShortLabel: STAGE_SHORT_LABELS[a.stage as Stage],
      status: bucket,
      statusLabel:
        bucket === LeadStatus.Rejected
          ? "Rejected"
          : bucket === LeadStatus.Disbursed
            ? "Disbursed"
            : STAGE_SHORT_LABELS[a.stage as Stage],
      isRejected: a.isRejected,
      rejectionReason: a.rejectionReason ?? null,
      loanAmount: a.loanAmount ?? 0,
      pendingDocumentCount,
      needsAction: a.stage === FIRST_STAGE && pendingDocumentCount > 0,
      createdAt: a.createdAt ?? null,
      updatedAt: a.updatedAt ?? null,
    };
  }

  /** Full detail payload for the Application-form screen. */
  private async detail(app: ApplicationDocument) {
    const [documents, assignedStaff, offer] = await Promise.all([
      this.documents.checklistView(app.id),
      this.staff.contactCard(app.staffId),
      this.offers.get(app.id),
    ]);
    const pendingDocuments = documents
      .filter(
        (d) =>
          d.status === DocumentStatus.Pending ||
          d.status === DocumentStatus.Rejected,
      )
      .map((d) => d.label);

    return {
      success: true,
      application: {
        ...this.listItem(
          app.toObject() as ApplicationLean,
          pendingDocuments.length,
        ),
        tracker: buildStageTracker(app.stage, app.isRejected),
        currentStageMessage: STAGE_CUSTOMER_MESSAGE[app.stage as Stage],
        documents,
        pendingDocuments,
        assignedStaff,
        offer,
        profile: app.profile,
        rejection: app.isRejected
          ? { reason: app.rejectionReason ?? null, at: app.rejectedAt ?? null }
          : null,
        submittedAt: app.submittedAt ?? null,
      },
    };
  }

  /** Placeholder kept for the (unbuilt) partner referral creation path. */
  startForPartner(): Promise<never> {
    throw new NotImplementedException(
      "applications.startForPartner — partner referral path not built",
    );
  }
}
