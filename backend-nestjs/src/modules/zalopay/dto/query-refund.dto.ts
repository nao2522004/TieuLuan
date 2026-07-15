import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class QueryRefundStatusDto {
  @ApiProperty({ example: "240715_2553_123456789" })
  @IsString()
  @IsNotEmpty()
  m_refund_id: string;
}
