import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { CommissionType } from "../schemas/product.schema";

export class CreateProductDto {
  @ApiProperty({ example: "Personal Loan" })
  @IsString()
  name!: string;

  @ApiProperty({ example: 10.5 })
  @IsNumber()
  @Min(0)
  interestRateMin!: number;

  @ApiProperty({ example: 24 })
  @IsNumber()
  @Min(0)
  interestRateMax!: number;

  @ApiPropertyOptional({ example: "1% – 2% of loan amount" })
  @IsOptional()
  @IsString()
  processingFee?: string;

  @ApiProperty({ enum: CommissionType, default: CommissionType.Percentage })
  @IsEnum(CommissionType)
  commissionType!: CommissionType;

  @ApiProperty({
    example: 1.5,
    description: "percent, or flat ₹ per disbursal",
  })
  @IsNumber()
  @Min(0)
  commissionValue!: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
