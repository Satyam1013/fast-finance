import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotImplementedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { customAlphabet } from "nanoid";
import { Application, ApplicationDocument } from "./schemas/application.schema";
import { EventsService } from "../events/events.service";
import { AuditService } from "../audit/audit.service";
import {
  FINAL_STAGE,
  FIRST_STAGE,
  nextStage,
  Role,
  Stage,
  STAGE_CUSTOMER_MESSAGE,
} from "../common/constants";
import type { AuthUser } from "../common/interfaces/authenticated-request";

const idTail = customAlphabet("0123456789", 6);

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applications: Model<ApplicationDocument>,
    private readonly events: EventsService,
    private readonly audit: AuditService,
  ) {}

  /** FR-CUS-08 — human-readable id, e.g. FF-2608-482193. */
  private newApplicationId(): string {
    const d = new Date();
    const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    return `FF-${mmdd}-${idTail()}`;
  }

  /**
   * FR-CUS-03/04 + §10.1 duplicate prevention. Before creating, look for an
   * existing application for the same customer + product at stage 1 with no
   * rejection; if found, return that instead of a duplicate.
   */
  async startOrResume(
    customerId: string,
    productId: string,
  ): Promise<ApplicationDocument> {
    const existing = await this.applications.findOne({
      customerId,
      productId,
      stage: FIRST_STAGE,
      isRejected: false,
    });
    if (existing) return existing;

    // TODO(FR-CUS-07, FR-PTR-12): capture profile, assign staff, seed the
    // six mandatory Document rows as PENDING, then create the Application.
    throw new NotImplementedException(
      "applications.startOrResume — creation path not built (needs profile + staff assignment + document seeding)",
    );
  }

  /**
   * FR-CUS-13 / PRD C-08 — reject at the API layer (not only the UI) until
   * every mandatory Document for the application is at least Submitted.
   */
  submit(_applicationId: string, _user: AuthUser): Promise<never> {
    // TODO: load documents, assert none are PENDING, then advance to stage 2.
    throw new NotImplementedException("applications.submit — not built");
  }

  /**
   * FR-STF-09/10, PRD §6.1 — advance ONE stage. Must be a single transaction:
   *   (a) update Application.stage (+ lock + commission trigger at FINAL_STAGE)
   *   (b) write a SYSTEM ChatMessage to the shared thread (FR-STF-11)
   *   (c) append an AuditLog entry with the actor
   *   (d) publish ONE DomainEvent — customer + referring partner + admin
   *       all receive it via their SSE stream (no independent polling)
   */
  async advanceStage(
    applicationId: string,
    actor: AuthUser,
  ): Promise<ApplicationDocument> {
    const app = await this.applications.findById(applicationId);
    if (!app) throw new BadRequestException("Application not found");
    if (app.locked || app.isRejected) {
      throw new ForbiddenException("This application can no longer be changed");
    }
    if (app.stage >= FINAL_STAGE) {
      throw new BadRequestException(
        "Application is already at the final stage",
      );
    }
    // Staff may only act on their own assigned applications (FRS §2.2).
    if (actor.role === Role.Staff && app.staffId !== actor.sub) {
      throw new ForbiddenException("This application is not assigned to you");
    }

    const from = app.stage;
    const to = nextStage(from);

    // TODO: wrap (a)–(d) in a Mongo session/transaction.
    app.stage = to;
    if (to === Stage.Disbursed) app.locked = true;
    await app.save();

    // (d) — single fan-out
    const audience = [app.customerId, app.staffId];
    if (app.partnerId) audience.push(app.partnerId);
    this.events.publish({
      audience,
      type: "stage.changed",
      applicationId: app.id,
      payload: { from, to, message: STAGE_CUSTOMER_MESSAGE[to] },
    });

    // (b) system message + (c) audit — delegated to their services once wired.
    // TODO(FR-STF-11): messaging.postSystem(app.id, STAGE_CUSTOMER_MESSAGE[to])
    // TODO(PRD A-13): audit.record({ action: STAGE_ADVANCED, ... })
    // TODO(FR-PTR-22): if (to === FINAL_STAGE) commission.calculateFor(app)

    return app;
  }

  /** Admin-only backward correction — every move logged (PRD §6.1 / A-03). */
  revertStage(_applicationId: string, _actor: AuthUser): Promise<never> {
    throw new NotImplementedException("applications.revertStage — not built");
  }

  /** Reject from any stage with a mandatory reason (§3.1 / PRD §6.1). */
  reject(
    _applicationId: string,
    _reason: string,
    _actor: AuthUser,
  ): Promise<never> {
    throw new NotImplementedException("applications.reject — not built");
  }

  /** FR-CUS-15/16/18 — the stage tracker + application list, scoped to caller. */
  listForCaller(_user: AuthUser): Promise<never> {
    throw new NotImplementedException("applications.listForCaller — not built");
  }
}
