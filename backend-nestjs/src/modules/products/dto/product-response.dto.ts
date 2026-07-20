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

  @ApiProperty({ example: "2026-12-31", nullable: true, description: "Hạn sử dụng gần nhất của các lô còn tồn kho" })
  nearest_expiry_date: string | null;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  updated_at: Date;

  @ApiProperty({
    example: 4200,
    description: "Giá bán sau khi áp giảm giá cận hạn (nếu có), tính real-time",
  })
  effective_price: number;

  @ApiProperty({
    example: 30,
    description: "% giảm giá cận hạn đang áp dụng, 0 nếu không có",
  })
  discount_percent: number;

  @ApiProperty({ example: true })
  is_expiry_discount_applied: boolean;
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

export class ProductAlertsDataDto {
  @ApiProperty({
    type: [ProductDto],
    description: "Sản phẩm có stock_quantity <= reorder_level",
  })
  low_stock: ProductDto[];

  @ApiProperty({
    type: [ProductDto],
    description:
      "Sản phẩm có expiry_date trong X ngày tới (X = PRODUCT_EXPIRY_ALERT_DAYS, " +
      "mặc định 7), bao gồm cả sản phẩm đã hết hạn tính tới thời điểm gọi API",
  })
  expiring_soon: ProductDto[];
}

export class ProductAlertsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ProductAlertsDataDto })
  data: ProductAlertsDataDto;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}

export type ProductDtoWithoutPricing = Omit<
  ProductDto,
  "effective_price" | "discount_percent" | "is_expiry_discount_applied"
>;
