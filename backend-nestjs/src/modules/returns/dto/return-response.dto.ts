import { ApiProperty } from "@nestjs/swagger";

export class ReturnDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  order_item_id: number;

  @ApiProperty({ example: 1 })
  quantity: number;

  @ApiProperty({
    example: 6000,
    description:
      "Tự động tính = quantity trả × unit_price của order_item tại thời điểm " +
      "bán (snapshot) - KHÔNG nhận từ client.",
  })
  refund_amount: number;

  @ApiProperty({ example: "Sản phẩm bị lỗi", nullable: true })
  reason: string | null;

  @ApiProperty({ example: 1, description: "ID nhân viên xử lý trả hàng" })
  created_by: number;

  @ApiProperty({ example: "2026-07-14T10:00:00.000Z" })
  created_at: Date;
}

export class ReturnResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ReturnDto })
  data: ReturnDto;

  @ApiProperty({ example: "2026-07-14T10:00:00.000Z" })
  timestamp: string;
}
