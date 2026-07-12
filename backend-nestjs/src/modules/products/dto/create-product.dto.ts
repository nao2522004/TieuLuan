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
  @IsNotEmpty({ message: "không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id: number;

  @ApiProperty({ example: 1 })
  @IsNotEmpty({ message: "không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  category_id: number;

  @ApiProperty({ example: "8938505970018", maxLength: 50 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(50, { message: "tối đa 50 ký tự" })
  barcode: string;

  @ApiProperty({ example: "Coca-Cola lon 330ml", maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(200, { message: "tối đa 200 ký tự" })
  name: string;

  @ApiProperty({ example: "lon", maxLength: 20 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(20, { message: "tối đa 20 ký tự" })
  unit: string;

  @ApiProperty({ example: 8000, description: "Giá vốn" })
  @IsNotEmpty({ message: "không được để trống" })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "phải là số, tối đa 2 chữ số thập phân" },
  )
  @Min(0, { message: "phải >= 0" })
  cost_price: number;

  @ApiProperty({ example: 10000, description: "Giá bán" })
  @IsNotEmpty({ message: "không được để trống" })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "phải là số, tối đa 2 chữ số thập phân" },
  )
  @Min(0, { message: "phải >= 0" })
  sale_price: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(0, { message: "phải >= 0" })
  stock_quantity?: number;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: "Ngưỡng cảnh báo tồn thấp",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(0, { message: "phải >= 0" })
  reorder_level?: number;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString({}, { message: "phải đúng định dạng ngày YYYY-MM-DD" })
  expiry_date?: string;
}
