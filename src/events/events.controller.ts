import { Controller, Sse } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { EventsService, DomainEvent } from "./events.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("events")
@ApiBearerAuth()
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** Long-lived Server-Sent Events stream for the authenticated user. */
  @Sse("stream")
  stream(@CurrentUser("sub") sub: string): Observable<{ data: DomainEvent }> {
    return this.events.streamFor(sub);
  }
}
