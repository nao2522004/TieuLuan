import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class InventoryTransactionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  product_id: number;

  @ApiProperty({ example: "IN", enum: ["IN", "OUT"] })
  type: string;

  @ApiProperty({
    example: "INBOUND",
    enum: ["ORDER", "INBOUND", "ADJUSTMENT", "STOCKTAKE"],
    description: "Nguồn gốc của biến động tồn kho",
  })
  source: string;

  @ApiProperty({
    example: "Hết hạn sử dụng",
    nullable: true,
    description: "Lý do điều chỉnh (bắt buộc đối với ADJUSTMENT)",
  })
  reason: string | null;

  @ApiProperty({ example: 50 })
  quantity: number;

  @ApiProperty({ example: 4000, nullable: true })
  unit_cost: number | null;

  @ApiProperty({ example: "Nhập hàng từ NCC ABC", nullable: true })
  note: string | null;

  @ApiProperty({ example: 1, description: "ID user thực hiện giao dịch" })
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

export class PaginatedInventoryTransactionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [InventoryTransactionDto] })
  data: InventoryTransactionDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-13T10:00:00.000Z" })
  timestamp: string;
}
