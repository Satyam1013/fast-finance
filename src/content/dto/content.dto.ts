import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { LenderKind } from "../schemas/lender.schema";

export class CreateBannerDto {
  @ApiProperty({ example: "Take Control of Your Finances" })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ description: "Asset key from POST /admin/assets" })
  @IsString()
  imageRef!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateGalleryItemDto {
  @ApiProperty({ description: "Asset key from POST /admin/assets" })
  @IsString()
  imageRef!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class LenderBranchDto {
  @ApiProperty({ example: "Indore — MG Road" })
  @IsString()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: "452001" })
  @IsString()
  pincode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateLenderDto {
  @ApiProperty({ example: "IIFL Finance" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: LenderKind, default: LenderKind.Nbfc })
  @IsOptional()
  @IsEnum(LenderKind)
  kind?: LenderKind;

  @ApiPropertyOptional({ description: "Asset key from POST /admin/assets" })
  @IsOptional()
  @IsString()
  logoRef?: string;

  @ApiPropertyOptional({ example: 10.5 })
  @IsOptional()
  @IsNumber()
  startingRate?: number;

  @ApiPropertyOptional({ type: [LenderBranchDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LenderBranchDto)
  branches?: LenderBranchDto[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
