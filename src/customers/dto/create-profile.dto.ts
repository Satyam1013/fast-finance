import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { EmploymentCategory } from "../../common/constants";

/** Strip spaces/dashes so "2345 6789 0123" and "2345-6789-0123" both validate. */
const stripToDigits = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.replace(/[\s-]/g, "") : value;
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

/** 12-digit Aadhaar (spaces from the UI are stripped before validation). */
export const AADHAAR_PATTERN = /^\d{12}$/;
/** Standard PAN format, e.g. ABCDE1234F. */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Create Profile screen — FR-CUS-07. Sent as multipart/form-data: these text
 * fields plus four files (`photo`, `aadhaarFront`, `aadhaarBack`, `panCard`),
 * all mandatory on first profile creation.
 */
export class CreateProfileDto {
  @ApiProperty({ example: "Suresh Patel", description: "Full name as per PAN" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: "suresh.patel@gmail.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: EmploymentCategory })
  @IsEnum(EmploymentCategory)
  employmentCategory!: EmploymentCategory;

  @ApiProperty({ example: "Madhya Pradesh" })
  @IsString()
  @MinLength(2)
  state!: string;

  @ApiProperty({ example: "Indore" })
  @IsString()
  @MinLength(2)
  city!: string;

  @ApiProperty({
    example: "234567890123",
    description: "12-digit Aadhaar number",
  })
  @Transform(stripToDigits)
  @IsString()
  @Matches(AADHAAR_PATTERN, {
    message: "aadhaarNumber must be exactly 12 digits",
  })
  aadhaarNumber!: string;

  @ApiProperty({ example: "ABCDE1234F" })
  @Transform(upperTrim)
  @IsString()
  @Matches(PAN_PATTERN, {
    message: "panNumber must be a valid PAN, e.g. ABCDE1234F",
  })
  panNumber!: string;
}
