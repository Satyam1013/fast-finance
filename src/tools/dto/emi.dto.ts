import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Max, Min } from "class-validator";

export class EmiRequestDto {
  @ApiProperty({ example: 100000, description: "Loan amount in rupees" })
  @IsNumber()
  @Min(1000)
  @Max(100000000)
  principal!: number;

  @ApiProperty({ example: 10.5, description: "Annual interest rate (percent)" })
  @IsNumber()
  @Min(0)
  @Max(100)
  annualRate!: number;

  @ApiProperty({ example: 60, description: "Tenure in months" })
  @IsNumber()
  @Min(1)
  @Max(480)
  tenureMonths!: number;
}
