import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateAdjustmentDto {
  @ApiProperty({ example: 1, description: "ID sản phẩm cần điều chỉnh" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  product_id: number;

  @ApiProperty({ example: 5, description: "Số lượng hao hụt/hủy (phải > 0)" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  quantity: number;

  @ApiProperty({
    example: "Hỏng vỡ bao bì",
    description: "Lý do hao hụt/hủy (bắt buộc)",
    maxLength: 255,
  })
  @IsString({ message: "phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  reason: string;

  @ApiPropertyOptional({ example: "Hộp sữa bị móp vỡ trong quá trình sắp xếp", maxLength: 255 })
  @IsOptional()
  @IsString({ message: "phải là chuỗi" })
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  note?: string;
}
