import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  LoanOffer,
  LoanOfferDocument,
  OfferStatus,
} from "./schemas/loan-offer.schema";
import {
  Application,
  ApplicationDocument,
} from "../applications/schemas/application.schema";
import { AuditService } from "../audit/audit.service";
import { MessagingService } from "../messaging/messaging.service";
import { computeEmi } from "../tools/emi";
import { AuditAction, Role, Stage } from "../common/constants";
import type { AuthUser } from "../common/interfaces/authenticated-request";
import { SetOfferDto } from "./dto/set-offer.dto";

/**
 * Loan Offer — Stage 3 (PRD §6). Set by Staff (own assigned), Partner (own
 * referrals) or Admin; accepted/rejected by the Customer via
 * {@link ApplicationsService} (which owns the stage transition).
 */
@Injectable()
export class OffersService {
  constructor(
    @InjectModel(LoanOffer.name)
    private readonly offers: Model<LoanOfferDocument>,
    // Read-only access for scoping — same model as ApplicationsModule, no cycle.
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    private readonly audit: AuditService,
    private readonly messaging: MessagingService,
  ) {}

  /** Current offer for an application — used internally, no scope check (caller already resolved the app). */
  async get(applicationId: string) {
    const offer = await this.offers.findOne({ applicationId }).lean();
    return offer ? this.present(offer) : null;
  }

  /** Scoped read for the standalone GET /applications/:id/offer route. */
  async getForCaller(applicationId: string, user: AuthUser) {
    const app = await this.applications.findById(applicationId).lean();
    if (!app || !this.canAccess(app, user)) {
      throw new NotFoundException("Application not found");
    }
    return this.get(applicationId);
  }

  private canAccess(
    app: Pick<Application, "customerId" | "staffId" | "partnerId">,
    user: AuthUser,
  ): boolean {
    switch (user.role) {
      case Role.Customer:
        return app.customerId === user.sub;
      case Role.Staff:
        return app.staffId === user.sub;
      case Role.Partner:
        return app.partnerId === user.sub;
      case Role.Admin:
        return true;
      default:
        return false;
    }
  }

  /** Staff/Partner/Admin — set or amend the offer while it is still PENDING. */
  async set(applicationId: string, dto: SetOfferDto, actor: AuthUser) {
    const app = await this.applications.findById(applicationId).lean();
    if (!app) throw new NotFoundException("Application not found");
    this.assertCanSet(app, actor);

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

    const existing = await this.offers.findOne({ applicationId }).lean();
    if (existing?.status === OfferStatus.Accepted) {
      throw new BadRequestException({
        success: false,
        code: "OFFER_ALREADY_ACCEPTED",
        message: "The customer has already accepted this offer.",
      });
    }

    const { emi } = computeEmi({
      principal: dto.loanAmount,
      annualRate: dto.interestRate,
      tenureMonths: dto.tenureMonths,
    });

    const offer = await this.offers.findOneAndUpdate(
      { applicationId },
      {
        loanAmount: dto.loanAmount,
        interestRate: dto.interestRate,
        tenureMonths: dto.tenureMonths,
        processingFee: dto.processingFee,
        emiAmount: emi,
        status: OfferStatus.Pending,
        setById: actor.sub,
        setByRole: actor.role,
        $unset: { respondedAt: "", customerNote: "" },
      },
      { new: true, upsert: true },
    );

    await this.audit.record({
      action: AuditAction.OfferSet,
      targetId: applicationId,
      targetType: "Application",
      actorId: actor.sub,
      actorRole: actor.role,
      actorName: actor.name,
      after: {
        loanAmount: dto.loanAmount,
        interestRate: dto.interestRate,
        tenureMonths: dto.tenureMonths,
      },
    });

    await this.messaging.postSystem(
      applicationId,
      `A loan offer is ready: ₹${dto.loanAmount.toLocaleString("en-IN")} at ${dto.interestRate}% for ${dto.tenureMonths} months (EMI ₹${emi.toLocaleString("en-IN")}). Please review and accept it to continue.`,
      [app.customerId, app.staffId, ...(app.partnerId ? [app.partnerId] : [])],
    );

    return this.present(offer.toObject());
  }

  /** Only a PENDING offer can be accepted/rejected — used by ApplicationsService. */
  async findPendingOrThrow(applicationId: string): Promise<LoanOfferDocument> {
    const offer = await this.offers.findOne({ applicationId });
    if (!offer || offer.status !== OfferStatus.Pending) {
      throw new BadRequestException({
        success: false,
        code: "NO_PENDING_OFFER",
        message: "There is no pending loan offer for this application.",
      });
    }
    return offer;
  }

  async markResponded(
    applicationId: string,
    status: OfferStatus.Accepted | OfferStatus.Rejected,
    customerNote?: string,
  ): Promise<void> {
    await this.offers.updateOne(
      { applicationId },
      { status, respondedAt: new Date(), customerNote },
    );
  }

  private assertCanSet(
    app: Pick<Application, "staffId" | "partnerId">,
    actor: AuthUser,
  ): void {
    if (actor.role === Role.Staff && app.staffId !== actor.sub) {
      throw new ForbiddenException("This application is not assigned to you");
    }
    if (actor.role === Role.Partner && app.partnerId !== actor.sub) {
      throw new ForbiddenException("This application was not referred by you");
    }
  }

  private present(o: LoanOffer & { createdAt?: Date }) {
    return {
      loanAmount: o.loanAmount,
      interestRate: o.interestRate,
      tenureMonths: o.tenureMonths,
      processingFee: o.processingFee ?? null,
      emiAmount: o.emiAmount,
      status: o.status,
      setByRole: o.setByRole,
      respondedAt: o.respondedAt ?? null,
      customerNote: o.customerNote ?? null,
      createdAt: o.createdAt ?? null,
    };
  }
}
