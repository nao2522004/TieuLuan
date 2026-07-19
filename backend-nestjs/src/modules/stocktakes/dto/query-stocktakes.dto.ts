import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsPositive, Max, Min } from "class-validator";

export class QueryStocktakesDto {
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;

  @ApiPropertyOptional({ example: "open", enum: ["open", "closed"] })
  @IsOptional()
  @IsIn(["open", "closed"], { message: "chỉ chấp nhận 'open' hoặc 'closed'" })
  status?: "open" | "closed";
}
