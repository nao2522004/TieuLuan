import { ApiProperty } from "@nestjs/swagger";

export class InventoryTransactionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  product_id: number;

  @ApiProperty({ example: "IN" })
  type: string;

  @ApiProperty({ example: 50 })
  quantity: number;

  @ApiProperty({ example: 4000, nullable: true })
  unit_cost: number | null;

  @ApiProperty({ example: "Nhập hàng từ NCC ABC", nullable: true })
  note: string | null;

  @ApiProperty({ example: 1, description: "ID user thực hiện nhập kho" })
  created_by: number;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  created_at: Date;
}

export class InventoryTransactionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: InventoryTransactionDto })
  data: InventoryTransactionDto;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  timestamp: string;
}
