import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class SetOfferDto {
  @ApiProperty({
    example: 500000,
    description: "Sanctioned loan amount, rupees",
  })
  @IsNumber()
  @Min(1000)
  loanAmount!: number;

  @ApiProperty({ example: 12.5, description: "Annual interest rate, percent" })
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate!: number;

  @ApiProperty({ example: 36 })
  @IsInt()
  @Min(1)
  @Max(480)
  tenureMonths!: number;

  @ApiPropertyOptional({ example: "1% of loan amount" })
  @IsOptional()
  @IsString()
  processingFee?: string;
}
