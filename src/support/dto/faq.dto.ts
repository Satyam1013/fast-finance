import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateFaqDto {
  @ApiProperty({ example: "How long does loan approval take?" })
  @IsString()
  @MinLength(3)
  question!: string;

  @ApiProperty({
    example:
      "Approval usually takes up to 7 days, depending on your documents and verification.",
  })
  @IsString()
  @MinLength(3)
  answer!: string;

  @ApiPropertyOptional({ example: "Loans" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
