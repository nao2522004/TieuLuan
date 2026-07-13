import { ApiProperty } from "@nestjs/swagger";

export class ShiftDataDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiProperty({ example: 1 })
  user_id: number;

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
    description: "closing_cash - expected_cash (dương = dư quỹ, âm = thiếu quỹ)",
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
