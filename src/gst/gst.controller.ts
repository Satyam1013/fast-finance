import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { GstService } from "./gst.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/constants";

@ApiTags("gst")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.Admin)
@Controller("admin/gst")
export class GstController {
  constructor(private readonly gst: GstService) {}

  @Get("dashboard")
  dashboard() {
    return this.gst.dashboard();
  }
}
