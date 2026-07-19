import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class StocktakeItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  stocktake_id: number;

  @ApiProperty({ example: 1 })
  product_id: number;

  @ApiProperty({ example: 100 })
  system_quantity: number;

  @ApiProperty({ example: 98 })
  counted_quantity: number;

  @ApiProperty({ example: -2 })
  difference: number;
}

export class StocktakeDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiProperty({ example: 1 })
  created_by: number;

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
