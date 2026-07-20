import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

// --------------- Response DTO ---------------

export class ProductBatchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  product_id: number;

  @ApiProperty({ example: "LÔ-20251231-1" })
  batch_code: string;

  @ApiProperty({ example: "2025-12-31", nullable: true })
  expiry_date: string | null;

  @ApiProperty({ example: 100 })
  quantity_received: number;

  @ApiProperty({ example: 80 })
  quantity_remaining: number;

  @ApiProperty({ example: 25000, nullable: true })
  unit_cost: number | null;

  @ApiProperty({ example: "2025-06-01T00:00:00.000Z" })
  received_at: Date;

  @ApiProperty({ example: 1, nullable: true })
  created_by: number | null;
}

export class ProductBatchListResponseDto {
  @ApiProperty({ type: [ProductBatchDto] })
  data: ProductBatchDto[];
}

// --------------- Update DTO ---------------

export class UpdateProductBatchDto {
  /** Chỉ cho phép sửa batch_code và expiry_date theo quy tắc Fallback thông minh */

  @ApiPropertyOptional({ example: "LÔ-20251231-1", description: "Mã lô. Nếu để trống sẽ giữ nguyên." })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batch_code?: string;

  @ApiPropertyOptional({ example: "2025-12-31", description: "Hạn sử dụng (YYYY-MM-DD). Nếu để trống sẽ giữ nguyên." })
  @IsOptional()
  @IsDateString()
  expiry_date?: string | null;

  @ApiPropertyOptional({ example: 25000, description: "Giá nhập mỗi đơn vị (không âm)." })
  @IsOptional()
  @IsInt()
  @Min(0)
  unit_cost?: number | null;
}
