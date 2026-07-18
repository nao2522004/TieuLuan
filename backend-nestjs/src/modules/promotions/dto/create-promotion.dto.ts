import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreatePromotionDto {
  @ApiProperty({ example: "GIAM20K", description: "Mã khuyến mãi (viết hoa, không khoảng trắng, duy nhất)" })
  @IsString({ message: "phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(50, { message: "tối đa 50 ký tự" })
  code: string;

  @ApiProperty({ example: "Giảm 20.000đ cho đơn hàng từ 100.000đ" })
  @IsString({ message: "phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(150, { message: "tối đa 150 ký tự" })
  name: string;

  @ApiProperty({ example: "fixed", enum: ["percent", "fixed"], description: "Loại giảm giá (percent: %, fixed: số tiền VND)" })
  @IsIn(["percent", "fixed"], { message: "chỉ nhận 'percent' hoặc 'fixed'" })
  @IsNotEmpty({ message: "không được để trống" })
  type: "percent" | "fixed";

  @ApiProperty({ example: 20000, description: "Giá trị giảm (nếu là percent: 1-100; nếu là fixed: > 0)" })
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0.01, { message: "phải lớn hơn 0" })
  @IsNotEmpty({ message: "không được để trống" })
  value: number;

  @ApiPropertyOptional({ example: 100000, description: "Giá trị đơn hàng tối thiểu để áp dụng" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  min_order_amount?: number;

  @ApiPropertyOptional({ example: 50000, description: "Số tiền giảm tối đa (chỉ có tác dụng với type='percent')" })
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
