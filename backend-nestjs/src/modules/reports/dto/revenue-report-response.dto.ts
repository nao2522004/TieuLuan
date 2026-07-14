import { ApiProperty } from "@nestjs/swagger";

export class RevenueReportDataDto {
  @ApiProperty({ example: "2026-07-01", nullable: true })
  from_date: string | null;

  @ApiProperty({ example: "2026-07-31", nullable: true })
  to_date: string | null;

  @ApiProperty({
    example: 1,
    nullable: true,
    description: "null = tổng hợp toàn hệ thống (mọi chi nhánh)",
  })
  branch_id: number | null;

  @ApiProperty({
    example: 120,
    description:
      "Số đơn hàng status='completed' trong khoảng thời gian - KHÔNG lọc " +
      "deleted_at (Mục 9: tính cả sản phẩm/nhân viên đã soft-delete, vì hóa " +
      "đơn cũ vẫn tham chiếu tới các bản ghi đó).",
  })
  total_orders: number;

  @ApiProperty({
    example: 15000000,
    description: "Tổng total_amount của các đơn completed (đã trừ discount_amount, CHƯA trừ trả hàng)",
  })
  gross_revenue: number;

  @ApiProperty({
    example: 500000,
    description: "Tổng refund_amount của các returns thuộc các đơn nằm trong phạm vi báo cáo",
  })
  total_refund: number;

  @ApiProperty({
    example: 14500000,
    description: "net_revenue = gross_revenue - total_refund",
  })
  net_revenue: number;
}

export class RevenueReportResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RevenueReportDataDto })
  data: RevenueReportDataDto;

  @ApiProperty({ example: "2026-07-14T10:00:00.000Z" })
  timestamp: string;
}
