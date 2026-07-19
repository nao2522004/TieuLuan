import { ApiProperty } from "@nestjs/swagger";

export class ExpiryDiscountRuleDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: "expiry", enum: ["expiry", "all_products"] })
  scope: string;
  @ApiProperty({ example: 3, nullable: true }) days_before_expiry:
    | number
    | null;
  @ApiProperty({ example: 30 }) discount_percent: number;
  @ApiProperty({ example: true }) is_active: boolean;
  @ApiProperty({ example: "2026-07-18T10:00:00.000Z" }) created_at: Date;
  @ApiProperty({ example: "2026-07-18T10:00:00.000Z" }) updated_at: Date;
}

export class ExpiryDiscountRuleResponseDto {
  @ApiProperty({ example: true }) success: boolean;
  @ApiProperty({ type: ExpiryDiscountRuleDto }) data: ExpiryDiscountRuleDto;
  @ApiProperty({ example: "2026-07-18T10:00:00.000Z" }) timestamp: string;
}

export class ExpiryDiscountRuleListResponseDto {
  @ApiProperty({ example: true }) success: boolean;
  @ApiProperty({ type: [ExpiryDiscountRuleDto] }) data: ExpiryDiscountRuleDto[];
  @ApiProperty({ example: "2026-07-18T10:00:00.000Z" }) timestamp: string;
}
