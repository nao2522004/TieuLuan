import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class AdjustmentBatchItemDto {
  @ApiProperty({ example: 101, description: "ID lô hàng cần trừ" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  batch_id: number;

  @ApiProperty({ example: 3, description: "Số lượng trừ ở lô này (phải > 0)" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  quantity: number;
}

export class CreateAdjustmentDto {
  @ApiProperty({ example: 1, description: "ID sản phẩm cần điều chỉnh" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  product_id: number;

  @ApiProperty({
    example: 5,
    description:
      "Tổng số lượng hao hụt/hủy (phải > 0). Nếu truyền 'batches', tổng " +
      "quantity của các lô trong 'batches' bắt buộc phải bằng đúng giá trị này.",
  })
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

  @ApiPropertyOptional({
    example: "Hộp sữa bị móp vỡ trong quá trình sắp xếp",
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: "phải là chuỗi" })
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  note?: string;

  @ApiPropertyOptional({
    example: 101,
    description:
      "ID lô hàng cụ thể cần trừ toàn bộ 'quantity' (tùy chọn, dùng khi chỉ trừ " +
      "1 lô duy nhất). Không truyền = tự động trừ theo FEFO. Không được truyền " +
      "đồng thời với 'batches'.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  batch_id?: number;

  @ApiPropertyOptional({
    type: [AdjustmentBatchItemDto],
    description:
      "Trừ theo NHIỀU lô cụ thể cùng lúc (VD: lô A hỏng 3, lô B hỏng 2). " +
      "Tổng quantity của các phần tử phải bằng đúng 'quantity' tổng ở trên. " +
      "Không được truyền đồng thời với 'batch_id'. Không được trùng batch_id " +
      "giữa các phần tử.",
  })
  @IsOptional()
  @IsArray({ message: "phải là mảng" })
  @ArrayNotEmpty({ message: "cần ít nhất 1 lô" })
  @ArrayMinSize(1, { message: "cần ít nhất 1 lô" })
  @ValidateNested({ each: true })
  @Type(() => AdjustmentBatchItemDto)
  batches?: AdjustmentBatchItemDto[];
}
