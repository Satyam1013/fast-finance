import { Global, Module } from "@nestjs/common";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";

/** Global so any module can inject {@link EventsService} without re-importing. */
@Global()
@Module({
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
