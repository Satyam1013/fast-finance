import { Module } from "@nestjs/common";
import { MastersController } from "./masters.controller";

@Module({
  controllers: [MastersController],
})
export class MastersModule {}
