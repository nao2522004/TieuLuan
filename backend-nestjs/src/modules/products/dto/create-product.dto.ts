import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty({ example: 1, description: "ID chi nhánh sở hữu sản phẩm" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  branch_id: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  category_id: number;

  @ApiPropertyOptional({
    example: "8931234500019",
    maxLength: 50,
    description: "Mã vạch. Bỏ trống = hệ thống tự động sinh mã vạch EAN-13",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "tối đa 50 ký tự" })
  barcode?: string;

  @ApiProperty({ example: "Nước suối Aquafina 500ml", maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(200, { message: "tối đa 200 ký tự" })
  name: string;

  @ApiProperty({ example: "chai", maxLength: 20 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(20, { message: "tối đa 20 ký tự" })
  unit: string;

  @ApiProperty({ example: 4000, description: "Giá vốn - NUMERIC(12,2)" })
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  @IsNotEmpty({ message: "không được để trống" })
  cost_price: number;

  @ApiProperty({ example: 6000, description: "Giá bán - NUMERIC(12,2)" })
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  @IsNotEmpty({ message: "không được để trống" })
  sale_price: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(0, { message: "phải >= 0" })
  stock_quantity?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(0, { message: "phải >= 0" })
  reorder_level?: number;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString({}, { message: "phải là ngày hợp lệ (YYYY-MM-DD)" })
  expiry_date?: string;
}
