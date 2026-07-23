import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class StocktakeItemBatchDto {
  @ApiProperty({ example: 1 })
  batch_id: number;

  @ApiProperty({ example: "LÔ-20260723-1" })
  batch_code: string;

  @ApiProperty({ example: "2026-12-31", nullable: true })
  expiry_date: string | null;

  @ApiProperty({ example: 50 })
  quantity_remaining: number;
}

export class StocktakeBatchAdjustmentDto {
  @ApiProperty({ example: "LÔ-20260723-1" })
  batch_code: string;

  @ApiProperty({ example: "2026-12-31", nullable: true })
  expiry_date: string | null;

  @ApiProperty({ example: "OUT", enum: ["IN", "OUT"] })
  type: "IN" | "OUT";

  @ApiProperty({ example: 2 })
  quantity: number;
}

export class StocktakeItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  stocktake_id: number;

  @ApiProperty({ example: 1 })
  product_id: number;

  @ApiProperty({ example: "Sữa tươi Vinamilk 1L", nullable: true })
  product_name?: string | null;

  @ApiProperty({ example: "8934567890123", nullable: true })
  product_barcode?: string | null;

  @ApiProperty({ example: "Hộp", nullable: true })
  unit?: string | null;

  @ApiProperty({ example: 100 })
  system_quantity: number;

  @ApiProperty({ example: 98 })
  counted_quantity: number;

  @ApiProperty({ example: -2 })
  difference: number;

  @ApiProperty({ type: [StocktakeItemBatchDto], nullable: true })
  batches?: StocktakeItemBatchDto[];

  @ApiProperty({ type: [StocktakeBatchAdjustmentDto], nullable: true })
  batch_adjustments?: StocktakeBatchAdjustmentDto[];
}

export class StocktakeSkippedItemDto {
  @ApiProperty({ example: 5 })
  product_id: number;

  @ApiProperty({
    example:
      "Sản phẩm đã bị xóa (hoặc không còn tồn tại) sau khi đếm — bỏ qua điều chỉnh tồn kho cho dòng này.",
  })
  reason: string;
}

export class StocktakeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiProperty({ example: "Chi nhánh Quận 1", nullable: true })
  branch_name?: string | null;

  @ApiProperty({ example: 1 })
  created_by: number;

  @ApiProperty({ example: "Nguyễn Văn A", nullable: true })
  creator_name?: string | null;

  @ApiProperty({ example: "open" })
  status: "open" | "closed";

  @ApiProperty({ example: "Kiểm kê hàng tháng 7", nullable: true })
  note: string | null;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-11T11:00:00.000Z", nullable: true })
  closed_at: Date | null;

  @ApiProperty({ type: [StocktakeItemDto], required: false })
  items?: StocktakeItemDto[];

  @ApiPropertyOptional({
    type: [StocktakeSkippedItemDto],
    description:
      "Danh sách sản phẩm bị bỏ qua khi chốt phiên do đã bị xóa mềm sau khi " +
      "được đếm. Chỉ xuất hiện trong response của PATCH /stocktakes/:id/close.",
  })
  skipped_items?: StocktakeSkippedItemDto[];
}

export class StocktakeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: StocktakeDto })
  data: StocktakeDto;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedStocktakeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [StocktakeDto] })
  data: StocktakeDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}
