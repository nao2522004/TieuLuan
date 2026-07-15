import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class RefundZaloPayOrderDto {
  @ApiProperty({ example: "240715150000123" })
  @IsString()
  @IsNotEmpty()
  zp_trans_id: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: "Hoan tien do loi san pham" })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  refund_fee_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  return_id?: number;
}
