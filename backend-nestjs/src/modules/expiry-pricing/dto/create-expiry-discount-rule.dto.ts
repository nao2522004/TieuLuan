import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class CreateExpiryDiscountRuleDto {
  @ApiProperty({
    example: 3,
    description: "Áp dụng khi sản phẩm còn <= X ngày tới hạn (0 = đã hết hạn)",
  })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(0, { message: "phải >= 0" })
  @IsNotEmpty({ message: "không được để trống" })
  days_before_expiry: number;

  @ApiProperty({ example: 30, description: "% giảm giá, 1-100" })
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0.01, { message: "phải > 0" })
  @Max(100, { message: "tối đa 100" })
  @IsNotEmpty({ message: "không được để trống" })
  discount_percent: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean({ message: "phải là true hoặc false" })
  is_active?: boolean;
}
