import { Injectable } from "@nestjs/common";
import { Subject, Observable, filter, map } from "rxjs";

export interface DomainEvent {
  /** Recipients — subject ids (customer/partner/staff _id) that should receive it. */
  audience: string[];
  type:
    | "stage.changed"
    | "application.rejected"
    | "document.updated"
    | "message.created"
    | "commission.calculated";
  applicationId?: string;
  payload: Record<string, unknown>;
}

/**
 * Single in-process fan-out for the "reflect without refresh" requirement
 * (FR-CUS-17, FR-STF-10, TC-SYNC-01). The stage-change transaction publishes
 * ONE event here; every subscribed role stream filters it by audience — no
 * per-role polling on different intervals (FRS §10.1).
 *
 * Scale-out note: swap the in-memory Subject for a Redis pub/sub adapter when
 * the API runs more than one instance.
 */
@Injectable()
export class EventsService {
  private readonly stream$ = new Subject<DomainEvent>();

  publish(event: DomainEvent) {
    this.stream$.next(event);
  }

  /** SSE stream scoped to one subject id. */
  streamFor(subjectId: string): Observable<{ data: DomainEvent }> {
    return this.stream$.pipe(
      filter((e) => e.audience.includes(subjectId)),
      map((data) => ({ data })),
    );
  }
}
