import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
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

/** "Insurance" / "credit card" -> "INSURANCE" / "CREDIT_CARD" — tolerate
 * whatever casing/spacing a client's dropdown sends. */
const normalizeEnumInput = ({ value }: { value: unknown }) =>
  typeof value === "string"
    ? value.trim().toUpperCase().replace(/\s+/g, "_")
    : value;

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
  @Transform(normalizeEnumInput)
  @IsEnum(ProductKind)
  kind?: ProductKind;

  /** Alias for `kind` — the admin panel's field name. Normalised the same way. */
  @ApiPropertyOptional({ enum: ProductKind, description: "Alias for `kind`." })
  @IsOptional()
  @Transform(normalizeEnumInput)
  @IsEnum(ProductKind)
  type?: ProductKind;

  @ApiPropertyOptional({ example: "Life, Health, Vehicle" })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 10.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRateMin?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRateMax?: number;

  /** Alias for interestRateMin/Max — e.g. "11% - 11%" or "10% - 15%". Parsed
   * into both fields when they aren't sent explicitly. */
  @ApiPropertyOptional({
    example: "10% - 15%",
    description: "Alias for interestRateMin/interestRateMax.",
  })
  @IsOptional()
  @IsString()
  rate?: string;

  @ApiPropertyOptional({ example: "1% – 2% of loan amount" })
  @IsOptional()
  @IsString()
  processingFee?: string;

  @ApiPropertyOptional({
    enum: CommissionType,
    default: CommissionType.Percentage,
  })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({
    example: 1.5,
    description:
      "percent, or flat ₹ per disbursal — defaults to 0, set later via PATCH",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionValue?: number;

  /** Alternative to a multipart `image` file — a `data:<mime>;base64,...` string. */
  @ApiPropertyOptional({
    description:
      "data:<mime>;base64,... — alternative to the multipart `image` file.",
  })
  @IsOptional()
  @IsString()
  image?: string;

  /** Alternative to both of the above — an already-uploaded key (e.g. from POST /admin/assets). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageRef?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
