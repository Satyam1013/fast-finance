import { ApiProperty } from "@nestjs/swagger";
import { IsJWT, IsString } from "class-validator";

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto extends RefreshDto {}

export class AccessTokenDto {
  @ApiProperty()
  @IsJWT()
  accessToken!: string;
}
