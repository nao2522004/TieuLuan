import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class PromotionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "GIAM20K" })
  code: string;

  @ApiProperty({ example: "Giảm 20.000đ cho đơn hàng từ 100.000đ" })
  name: string;

  @ApiProperty({ example: "fixed", enum: ["percent", "fixed"] })
  type: string;

  @ApiProperty({ example: 20000 })
  value: number;

  @ApiProperty({ example: 100000, nullable: true })
  min_order_amount: number | null;

  @ApiProperty({ example: 50000, nullable: true })
  max_discount_amount: number | null;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: "2026-07-17T00:00:00.000Z" })
  starts_at: Date;

  @ApiProperty({ example: "2026-08-17T00:00:00.000Z", nullable: true })
  ends_at: Date | null;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  updated_at: Date;
}

export class PromotionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PromotionDto })
  data: PromotionDto;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedPromotionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [PromotionDto] })
  data: PromotionDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  timestamp: string;
}

export class ValidatePromotionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: Object,
    example: {
      valid: true,
      discount_amount: 20000,
      reason: null,
    },
  })
  data: {
    valid: boolean;
    discount_amount: number;
    reason: string | null;
  };

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  timestamp: string;
}
