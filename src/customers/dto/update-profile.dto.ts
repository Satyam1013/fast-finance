import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { EmploymentCategory } from "../../common/constants";

/**
 * Edit Profile screen. Multipart: any subset of these fields, optionally with a
 * replacement `photo` file. Mobile number is not editable here (it is the login
 * identity — PRD §2.2).
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Suresh Patel" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: "suresh.patel@gmail.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: EmploymentCategory })
  @IsOptional()
  @IsEnum(EmploymentCategory)
  employmentCategory?: EmploymentCategory;

  @ApiPropertyOptional({ example: "Madhya Pradesh" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  state?: string;

  @ApiPropertyOptional({ example: "Indore" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;
}
