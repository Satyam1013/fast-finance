import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { EmploymentCategory } from "../../common/constants";

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
}
