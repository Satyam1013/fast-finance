import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class RequestOtpDto {
  @ApiProperty({ example: "9876543210", description: "10-digit Indian mobile" })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: "mobile must be a valid 10-digit number",
  })
  mobile!: string;
}
