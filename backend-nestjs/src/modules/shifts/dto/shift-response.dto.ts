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

  @ApiProperty({ example: "cash", enum: ["cash", "card", "transfer"] })
  payment_method: string;

  @ApiProperty({ example: "paid", enum: ["pending", "paid"] })
  payment_status: string;

  @ApiProperty({ example: "completed", enum: ["completed", "cancelled"] })
  status: string;

  @ApiProperty({ example: 55000 })
  total_amount: number;

  @ApiProperty({ example: "2026-07-15T08:10:00.000Z" })
  created_at: Date;
}

export class ShiftDetailDataDto extends ShiftDataDto {
  @ApiProperty({
    example: 8,
    description: "Số đơn hàng status='completed' phát sinh trong ca",
  })
  orders_count: number;

  @ApiProperty({
    example: 750000,
    description:
      "Tổng total_amount các đơn thanh toán bằng tiền mặt trong ca (dùng đối soát quỹ)",
  })
  cash_orders_total: number;

  @ApiProperty({ example: 200000 })
  card_orders_total: number;

  @ApiProperty({ example: 300000 })
  transfer_orders_total: number;

  @ApiProperty({
    type: [ShiftOrderSummaryDto],
    description: "Danh sách đơn hàng thuộc ca này, sắp theo id tăng dần",
  })
  orders: ShiftOrderSummaryDto[];
}

export class ShiftDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ShiftDetailDataDto })
  data: ShiftDetailDataDto;

  @ApiProperty({ example: "2026-07-15T10:00:00.000Z" })
  timestamp: string;
}
