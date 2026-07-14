import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateOrderItemDto {
  @ApiProperty({
    example: 1,
    description: "ID sản phẩm (phải thuộc chi nhánh của ca đang mở)",
  })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  product_id: number;

  @ApiProperty({ example: 2, description: "Số lượng mua (phải > 0)" })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    example: "cash",
    enum: ["cash", "card", "transfer"],
    description:
      "'cash'/'card' -> payment_status='paid' ngay. 'transfer' -> đơn tạo ra ở " +
      "payment_status='pending', response kèm qr_code/qr_content để khách quét " +
      "chuyển khoản, xác nhận qua PATCH /orders/:id/confirm-payment.",
  })
  @IsIn(["cash", "card", "transfer"], {
    message: "chỉ chấp nhận 'cash', 'card' hoặc 'transfer'",
  })
  @IsNotEmpty({ message: "không được để trống" })
  payment_method: "cash" | "card" | "transfer";

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description:
      "Số tiền giảm giá cho cả đơn (không được lớn hơn tổng tiền hàng)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  discount_amount?: number;

  @ApiProperty({
    type: [CreateOrderItemDto],
    description:
      "Danh sách sản phẩm trong đơn (tối thiểu 1 dòng, không trùng product_id)",
  })
  @IsArray({ message: "phải là mảng" })
  @ArrayMinSize(1, { message: "phải có ít nhất 1 sản phẩm" })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
