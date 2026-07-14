import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  product_id: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({
    example: 6000,
    description: "Giá bán tại thời điểm tạo đơn (snapshot)",
  })
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

  @ApiPropertyOptional({
    example:
      "00020101021238570010A00000072701270006970422011001234567890208QRIBFTTA5204000053037045406120000005802VN5910STORE...6304ABCD",
    nullable: true,
    description:
      "Chuỗi VietQR chuẩn EMVCo. Chỉ có giá trị khi payment_method='transfer' " +
      "và payment_status='pending' (sinh real-time, không lưu DB).",
  })
  qr_content?: string | null;

  @ApiPropertyOptional({
    example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    nullable: true,
    description:
      "Ảnh QR base64 PNG (data URI) render sẵn từ qr_content cho FE.",
  })
  qr_code?: string | null;
}

export class OrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: OrderDataDto })
  data: OrderDataDto;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  timestamp: string;
}
