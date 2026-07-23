import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class ShiftDataDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiProperty({
    example: "Chi nhánh Quận 1",
    nullable: true,
    description: "Tên chi nhánh, hiển thị kèm branch_id để UI dễ đọc.",
  })
  branch_name: string | null;

  @ApiProperty({ example: 1 })
  user_id: number;

  @ApiProperty({
    example: "Nguyễn Văn A",
    nullable: true,
    description: "Tên nhân viên đứng ca, hiển thị kèm user_id để UI dễ đọc.",
  })
  user_full_name: string | null;

  @ApiProperty({ example: 500000 })
  opening_cash: number;

  @ApiProperty({ example: 1250000, nullable: true })
  closing_cash: number | null;

  @ApiProperty({
    example: 1200000,
    nullable: true,
    description:
      "Mức tối giản: opening_cash + tổng total_amount các đơn payment_method='cash' " +
      "thuộc ca này (chưa trừ Returns) — sẽ hoàn thiện đầy đủ ở tính năng Shifts riêng.",
  })
  expected_cash: number | null;

  @ApiProperty({
    example: 50000,
    nullable: true,
    description:
      "closing_cash - expected_cash (dương = dư quỹ, âm = thiếu quỹ)",
  })
  cash_difference: number | null;

  @ApiProperty({ example: "Ca sáng", nullable: true })
  note: string | null;

  @ApiProperty({ example: "2026-07-13T07:00:00.000Z" })
  opened_at: Date;

  @ApiProperty({ example: "2026-07-13T15:00:00.000Z", nullable: true })
  closed_at: Date | null;

  @ApiProperty({
    example: [{ id: 2, full_name: "Nhân viên thu ngân" }],
    description: "Danh sách thu ngân được gán vào ca",
    nullable: true,
  })
  cashiers?: { id: number; full_name: string }[];
}

export class ShiftResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ShiftDataDto })
  data: ShiftDataDto;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedShiftResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ShiftDataDto] })
  data: ShiftDataDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-14T10:00:00.000Z" })
  timestamp: string;
}

export class ShiftOrderSummaryDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({
    example: 2,
    description: "ID nhân viên tạo đơn (orders.created_by)",
  })
  created_by: number;

  @ApiProperty({
    example: "Nguyễn Văn A",
    nullable: true,
    description: "Tên nhân viên tạo đơn, hiển thị kèm created_by để UI dễ đọc.",
  })
  created_by_name: string | null;

  @ApiProperty({ example: "cash", enum: ["cash", "card", "transfer"] })
  payment_method: string;

  @ApiProperty({ example: "paid", enum: ["pending", "paid"] })
  payment_status: string;

  @ApiProperty({ example: "completed", enum: ["completed", "cancelled"] })
  status: string;

  @ApiProperty({ example: 55000 })
  total_amount: number;

  @ApiProperty({
    example: 0,
    description: "Tổng số tiền đã trả/hoàn tiền cho đơn này trong ca (nếu có)",
  })
  refunded_amount: number;

  @ApiProperty({ example: "2026-07-15T08:10:00.000Z" })
  created_at: Date;
}

export class ShiftReturnSummaryDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({
    example: 45,
    description: "order_id chứa dòng sản phẩm bị trả",
  })
  order_id: number;

  @ApiProperty({ example: 3, description: "order_item_id bị trả" })
  order_item_id: number;

  @ApiProperty({ example: "Nước suối Lavie 500ml", nullable: true })
  product_name: string | null;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 12000 })
  refund_amount: number;

  @ApiProperty({ example: "cash", enum: ["cash", "card", "transfer"] })
  payment_method: string;

  @ApiProperty({ example: "Sản phẩm bị lỗi", nullable: true })
  reason: string | null;

  @ApiProperty({ example: 5, description: "ID nhân viên xử lý trả hàng" })
  created_by: number;

  @ApiProperty({ example: "Nguyễn Văn A", nullable: true })
  created_by_name: string | null;

  @ApiProperty({ example: "2026-07-17T09:30:00.000Z" })
  created_at: Date;
}

export class ShiftDetailDataDto extends ShiftDataDto {
  @ApiProperty({ example: 8 })
  orders_count: number;

  @ApiProperty({ example: 750000 })
  cash_orders_total: number;

  @ApiProperty({ example: 200000 })
  card_orders_total: number;

  @ApiProperty({ example: 300000 })
  transfer_orders_total: number;

  @ApiProperty({
    example: 50000,
    description:
      "Tổng refund_amount của các Return thuộc đơn hàng payment_method='cash' " +
      "trong ca này — dùng trừ vào quỹ dự kiến khi đối soát tiền mặt.",
  })
  cash_returns_total: number;

  @ApiProperty({ example: 0 })
  card_returns_total: number;

  @ApiProperty({ example: 0 })
  transfer_returns_total: number;

  @ApiProperty({
    example: 1250000,
    description:
      "Quỹ dự kiến tính real-time = opening_cash + cash_orders_total - " +
      "cash_returns_total. Luôn tính được kể cả khi ca đang mở (khác với " +
      "expected_cash chỉ có giá trị sau khi đóng ca), giúp nhân viên xem " +
      "trước độ chênh lệch trước khi bấm Đóng ca.",
  })
  live_expected_cash: number;

  @ApiProperty({ type: [ShiftOrderSummaryDto] })
  orders: ShiftOrderSummaryDto[];

  @ApiProperty({
    type: [ShiftReturnSummaryDto],
    description:
      "Danh sách từng giao dịch trả hàng phát sinh trong ca, sắp theo id tăng dần",
  })
  returns: ShiftReturnSummaryDto[];
}

export class ShiftDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ShiftDetailDataDto })
  data: ShiftDetailDataDto;

  @ApiProperty({ example: "2026-07-15T10:00:00.000Z" })
  timestamp: string;
}
