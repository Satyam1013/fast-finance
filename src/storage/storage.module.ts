import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StorageService } from "./storage.service";
import { FilesController } from "./files.controller";

/** Global so any feature module can inject {@link StorageService}. */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [StorageService],
  controllers: [FilesController],
  exports: [StorageService],
})
export class StorageModule {}
