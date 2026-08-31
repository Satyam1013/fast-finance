import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

export class VerifyOtpDto {
  @ApiProperty({ example: "9876543210" })
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  mobile!: string;

  @ApiProperty({ example: "000000" })
  @IsString()
  @Length(6, 6)
  code!: string;
}
