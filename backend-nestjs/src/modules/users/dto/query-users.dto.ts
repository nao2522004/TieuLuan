import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class QueryUsersDto {
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
    description: "Lọc nhân viên theo chi nhánh",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;

  @ApiPropertyOptional({
    example: "cashier",
    enum: ["admin", "leader", "cashier"],
    description: "Lọc theo vai trò",
  })
  @IsOptional()
  @IsIn(["admin", "leader", "cashier"], {
    message: "chỉ chấp nhận 'admin', 'leader' hoặc 'cashier'",
  })
  role_code?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Lọc theo trạng thái hoạt động",
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === true || value === "true",
  )
  @IsBoolean({ message: "phải là true hoặc false" })
  is_active?: boolean;

  @ApiPropertyOptional({
    example: "Nguyễn",
    description: "Tìm kiếm theo tên (full_name) hoặc ID nhân viên",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
