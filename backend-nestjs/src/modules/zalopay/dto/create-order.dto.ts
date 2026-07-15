import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateZaloPayOrderDto {
  @ApiProperty({ example: "user123" })
  @IsString()
  @IsNotEmpty()
  app_user: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: "Thanh toan don hang #123" })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  embed_data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  item?: any[];
}
