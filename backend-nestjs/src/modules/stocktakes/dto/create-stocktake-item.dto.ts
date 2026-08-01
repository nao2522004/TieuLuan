import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class BatchCountDto {
  @ApiProperty({ example: 3, description: "ID lô hàng" })
  @IsNotEmpty({ message: "batch_id không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "batch_id phải là số nguyên" })
  @IsPositive({ message: "batch_id phải là số nguyên dương" })
  batch_id: number;

  @ApiProperty({ example: 45, description: "Số đếm thực tế của lô này" })
  @IsNotEmpty({ message: "counted_quantity không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "counted_quantity phải là số nguyên" })
  @Min(0, { message: "counted_quantity phải lớn hơn hoặc bằng 0" })
  counted_quantity: number;
}

export class CreateStocktakeItemDto {
  @ApiProperty({ example: 1, description: "ID sản phẩm cần kiểm" })
  @IsNotEmpty({ message: "product_id không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "product_id phải là số nguyên" })
  @IsPositive({ message: "product_id phải là số nguyên dương" })
  product_id: number;

  @ApiProperty({
    example: 98,
    description: "Số lượng đếm thực tế (tổng tất cả lô)",
  })
  @IsNotEmpty({ message: "counted_quantity không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "counted_quantity phải là số nguyên" })
  @Min(0, { message: "counted_quantity phải lớn hơn hoặc bằng 0" })
  counted_quantity: number;

  @ApiPropertyOptional({
    type: [BatchCountDto],
    description:
      "Chi tiết số đếm theo từng lô. Nếu gửi, backend sẽ cộng/trừ đúng lô khi " +
      "chốt phiên thay vì dùng FEFO mù. Tuỳ chọn — backward compatible.",
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BatchCountDto)
  batch_counts?: BatchCountDto[];
}

export class BulkCreateStocktakeItemDto {
  @ApiProperty({ type: [CreateStocktakeItemDto] })
  @IsNotEmpty({ message: "items không được để trống" })
  @Type(() => CreateStocktakeItemDto)
  items: CreateStocktakeItemDto[];
}
