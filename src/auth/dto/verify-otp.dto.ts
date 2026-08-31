import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsString, Length, Matches } from "class-validator";

export class VerifyOtpDto {
  @ApiProperty({ example: "9876543210" })
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  mobile!: string;

  /** 4-digit numeric code — matches the mobile app OTP screen (4 boxes). */
  @ApiProperty({ example: "0000", minLength: 4, maxLength: 4 })
  @IsNumberString()
  @Length(4, 4)
  code!: string;
}
