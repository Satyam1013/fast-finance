import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class StaffLoginDto {
  @ApiProperty({ example: "officer@fastfinance.in" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "••••••••" })
  @IsString()
  @MinLength(8)
  password!: string;
}
