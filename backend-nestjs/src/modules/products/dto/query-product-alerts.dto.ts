import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ProductBranchScopeDto } from "./product-branch-scope.dto";

export class QueryProductAlertsDto extends ProductBranchScopeDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(1, { message: "tối thiểu là 1" })
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(1, { message: "tối thiểu là 1" })
  @Max(100, { message: "tối đa là 100" })
  limit?: number = 10;
}

export class QueryExpiringSoonDto extends QueryProductAlertsDto {
  @ApiPropertyOptional({
    example: 7,
    description: "Số ngày tính sản phẩm sắp hết hạn (mặc định lấy từ PRODUCT_EXPIRY_ALERT_DAYS hoặc 7)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(1, { message: "tối thiểu là 1" })
  days?: number;
}
