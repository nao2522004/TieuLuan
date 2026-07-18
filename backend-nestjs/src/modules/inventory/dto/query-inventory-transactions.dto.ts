import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from "class-validator";
import { InventoryTransactionSource, InventoryTransactionType } from "../entities/inventory-transaction.entity";

export class QueryInventoryTransactionsDto {
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

  @ApiPropertyOptional({
    example: 1,
    description: "Lọc theo ID sản phẩm",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  product_id?: number;

  @ApiPropertyOptional({
    example: "OUT",
    enum: ["IN", "OUT"],
    description: "Lọc theo loại biến động (IN/OUT)",
  })
  @IsOptional()
  @IsIn(["IN", "OUT"], {
    message: "chỉ chấp nhận 'IN' hoặc 'OUT'",
  })
  type?: InventoryTransactionType;

  @ApiPropertyOptional({
    example: "ADJUSTMENT",
    enum: ["ORDER", "INBOUND", "ADJUSTMENT", "STOCKTAKE"],
    description: "Lọc theo nguồn biến động",
  })
  @IsOptional()
  @IsIn(["ORDER", "INBOUND", "ADJUSTMENT", "STOCKTAKE"], {
    message: "chỉ chấp nhận 'ORDER', 'INBOUND', 'ADJUSTMENT', hoặc 'STOCKTAKE'",
  })
  source?: InventoryTransactionSource;
}
