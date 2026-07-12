import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class ProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  branch_id: number;

  @ApiProperty({ example: 1 })
  category_id: number;

  @ApiProperty({ example: "8931234500019" })
  barcode: string;

  @ApiProperty({ example: "Nước suối Aquafina 500ml" })
  name: string;

  @ApiProperty({ example: "chai" })
  unit: string;

  @ApiProperty({ example: 4000 })
  cost_price: number;

  @ApiProperty({ example: 6000 })
  sale_price: number;

  @ApiProperty({ example: 100 })
  stock_quantity: number;

  @ApiProperty({ example: 10 })
  reorder_level: number;

  @ApiProperty({ example: "2026-12-31", nullable: true })
  expiry_date: string | null;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  updated_at: Date;
}

export class ProductResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ProductDto })
  data: ProductDto;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedProductResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ProductDto] })
  data: ProductDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}
