import { ApiProperty } from "@nestjs/swagger";

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  product_id: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 6000, description: "Giá bán tại thời điểm tạo đơn (snapshot)" })
  unit_price: number;
}

export class OrderDataDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiProperty({ example: 1, nullable: true })
  shift_id: number | null;

  @ApiProperty({ example: 1, description: "ID user (thu ngân) tạo đơn" })
  created_by: number;

  @ApiProperty({ example: "completed" })
  status: string;

  @ApiProperty({ example: "cash" })
  payment_method: string;

  @ApiProperty({ example: "paid" })
  payment_status: string;

  @ApiProperty({ example: 0 })
  discount_amount: number;

  @ApiProperty({ example: 12000 })
  total_amount: number;

  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[];

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  updated_at: Date;
}

export class OrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: OrderDataDto })
  data: OrderDataDto;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  timestamp: string;
}
