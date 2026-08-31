import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { EmiRequestDto } from "./dto/emi.dto";
import { computeEmi } from "./emi";

@ApiTags("tools")
@Controller("tools")
export class ToolsController {
  /** Home screen EMI calculator — no persistence, pure calculation. */
  @Public()
  @Post("emi")
  emi(@Body() dto: EmiRequestDto) {
    return { success: true, ...computeEmi(dto) };
  }
}
