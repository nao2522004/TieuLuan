import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdatePromotionDto {
  @ApiPropertyOptional({ example: "GIAM20K" })
  @IsOptional()
  @IsString({ message: "phải là chuỗi ký tự" })
  @MaxLength(50, { message: "tối đa 50 ký tự" })
  code?: string;

  @ApiPropertyOptional({ example: "Giảm 20.000đ cho đơn hàng từ 100.000đ" })
  @IsOptional()
  @IsString({ message: "phải là chuỗi ký tự" })
  @MaxLength(150, { message: "tối đa 150 ký tự" })
  name?: string;

  @ApiPropertyOptional({ example: "fixed", enum: ["percent", "fixed"] })
  @IsOptional()
  @IsIn(["percent", "fixed"], { message: "chỉ nhận 'percent' hoặc 'fixed'" })
  type?: "percent" | "fixed";

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0.01, { message: "phải lớn hơn 0" })
  value?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  min_order_amount?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  max_discount_amount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: "phải là true hoặc false" })
  is_active?: boolean;

  @ApiPropertyOptional({ example: "2026-07-17T00:00:00.000Z" })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "phải là ngày hợp lệ" })
  starts_at?: Date;

  @ApiPropertyOptional({ example: "2026-08-17T00:00:00.000Z" })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: "phải là ngày hợp lệ" })
  ends_at?: Date;
}
