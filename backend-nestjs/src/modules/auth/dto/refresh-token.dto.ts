import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({ example: "9f1c2e4b7a...(hex 96 ký tự)" })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  refresh_token: string;
}
