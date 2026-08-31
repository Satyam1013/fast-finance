import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class PartnerLoginDto {
  @ApiProperty({
    example: "FFP-7Q2K",
    description: "Partner code issued by Admin",
  })
  @IsString()
  @Length(4, 20)
  partnerCode!: string;
}
