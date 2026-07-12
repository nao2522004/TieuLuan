import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class QueryBranchDto {
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
    example: "quận 1",
    description: "Tìm theo tên chi nhánh",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
