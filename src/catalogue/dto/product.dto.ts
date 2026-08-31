import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";
import { CommissionType, ProductKind } from "../schemas/product.schema";

export class CreateProductDto {
  @ApiProperty({ example: "Personal Loan" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: "PL",
    description:
      "Code used in Application IDs. Derived from the name if omitted.",
  })
  @IsOptional()
  @IsString()
  @Length(2, 6)
  code?: string;

  @ApiPropertyOptional({ enum: ProductKind, default: ProductKind.Loan })
  @IsOptional()
  @IsEnum(ProductKind)
  kind?: ProductKind;

  @ApiPropertyOptional({ example: "Life, Health, Vehicle" })
  @IsOptional()
  @IsString()
  subtitle?: string;

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
