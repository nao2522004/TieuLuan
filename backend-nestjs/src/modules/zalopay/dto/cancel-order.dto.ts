import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CancelZaloPayOrderDto {
  @ApiProperty({ example: "240715_12345678" })
  @IsString()
  @IsNotEmpty()
  app_trans_id: string;
}
