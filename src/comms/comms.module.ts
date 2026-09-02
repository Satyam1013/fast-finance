import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommsService } from "./comms.service";

/** Global so auth (and later, referral sharing) can inject {@link CommsService}. */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CommsService],
  exports: [CommsService],
})
export class CommsModule {}
