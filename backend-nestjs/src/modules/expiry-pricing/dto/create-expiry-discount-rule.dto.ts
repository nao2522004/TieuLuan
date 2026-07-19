import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from "class-validator";
import { ExpiryDiscountRuleScope } from "../entities/expiry-discount-rule.entity";

export class CreateExpiryDiscountRuleDto {
  @ApiPropertyOptional({
    example: "expiry",
    enum: ["expiry", "all_products"],
    default: "expiry",
    description:
      "'expiry': áp dụng theo số ngày còn lại tới hạn sử dụng (mặc định, hành vi cũ). " +
      "'all_products': áp dụng cho TOÀN BỘ sản phẩm, dùng cho sự kiện giảm giá " +
      "toàn cửa hàng (VD: Tết, Black Friday), không cần expiry_date.",
  })
  @IsOptional()
  @IsIn(["expiry", "all_products"], {
    message: "chỉ chấp nhận 'expiry' hoặc 'all_products'",
  })
  scope?: ExpiryDiscountRuleScope;

  @ApiPropertyOptional({
    example: 3,
    description:
      "BẮT BUỘC khi scope='expiry': áp dụng khi sản phẩm còn <= X ngày tới hạn " +
      "(0 = đã hết hạn). Bỏ qua (không cần truyền) khi scope='all_products'.",
  })
  @ValidateIf((o) => (o.scope ?? "expiry") === "expiry")
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(0, { message: "phải >= 0" })
  @IsNotEmpty({ message: "bắt buộc khi scope='expiry'" })
  days_before_expiry?: number;

  @ApiProperty({ example: 30, description: "% giảm giá, 1-100" })
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0.01, { message: "phải > 0" })
  @Max(100, { message: "tối đa 100" })
  @IsNotEmpty({ message: "không được để trống" })
  discount_percent: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean({ message: "phải là true hoặc false" })
  is_active?: boolean;
}
