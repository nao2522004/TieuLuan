import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  product_id: number;

  @ApiProperty({ example: "Nước suối Lavie 500ml", nullable: true })
  product_name: string | null;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({
    example: 6000,
    description:
      "Giá bán tại thời điểm tạo đơn (đã bao gồm giảm giá cận hạn nếu có) - snapshot",
  })
  unit_price: number;

  @ApiProperty({
    example: 8000,
    nullable: true,
    description:
      "Giá bán gốc trước khi áp giảm giá cận hạn (snapshot tại thời điểm bán). " +
      "NULL nếu sản phẩm không bị áp giảm giá cận hạn khi bán.",
  })
  original_unit_price: number | null;

  @ApiProperty({
    example: 25,
    nullable: true,
    description:
      "% giảm giá cận hạn đã áp dụng tại thời điểm bán, NULL nếu không áp dụng",
  })
  discount_percent: number | null;
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

  @ApiPropertyOptional({ example: "240715_2553_123456" })
  zalopay_app_trans_id?: string | null;

  @ApiPropertyOptional({ example: "240715150000123" })
  zalopay_zp_trans_id?: string | null;

  @ApiPropertyOptional({
    example: "TET2026",
    nullable: true,
    description:
      "Mã khuyến mãi đã áp dụng cho đơn hàng này (nếu có), lưu lại để đối soát báo cáo.",
  })
  promotion_code?: string | null;

  @ApiPropertyOptional({
    example: "percent",
    enum: ["percent", "fixed"],
    nullable: true,
  })
  promotion_type?: "percent" | "fixed" | null;

  @ApiPropertyOptional({
    example: 20,
    nullable: true,
    description:
      "Giá trị mã KM snapshot (% nếu type=percent, VND nếu type=fixed)",
  })
  promotion_value?: number | null;
}

export class OrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: OrderDataDto })
  data: OrderDataDto;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedOrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [OrderDataDto] })
  data: OrderDataDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-14T10:00:00.000Z" })
  timestamp: string;
}
