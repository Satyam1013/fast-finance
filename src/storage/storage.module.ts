import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StorageService } from "./storage.service";
import { FilesController } from "./files.controller";
import { STORAGE_DRIVER, type StorageDriver } from "./drivers/storage-driver";
import { LocalStorageDriver } from "./drivers/local.driver";
import { S3StorageDriver } from "./drivers/s3.driver";

/** Global so any feature module can inject {@link StorageService}. */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageDriver =>
        config.get<string>("STORAGE_DRIVER", "local") === "s3"
          ? new S3StorageDriver(config)
          : new LocalStorageDriver(),
    },
    StorageService,
  ],
  controllers: [FilesController],
  exports: [StorageService],
})
export class StorageModule {}
