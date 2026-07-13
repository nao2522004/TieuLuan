import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateInventoryTransactionDto {
  @ApiProperty({ example: 1, description: "ID sản phẩm cần nhập kho" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  product_id: number;

  @ApiProperty({ example: 50, description: "Số lượng nhập thêm (phải > 0)" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  quantity: number;

  @ApiPropertyOptional({
    example: 4000,
    description:
      "Giá vốn tham khảo tại thời điểm nhập lô này - CHỈ lưu tham khảo, " +
      "không dùng để tính giá vốn trung bình (mức tối giản theo lịch trình)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  unit_cost?: number;

  @ApiPropertyOptional({ example: "Nhập hàng từ NCC ABC", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  note?: string;
}
