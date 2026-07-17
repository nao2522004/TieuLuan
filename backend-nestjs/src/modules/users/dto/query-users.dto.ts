import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsPositive } from "class-validator";

export class QueryUsersDto {
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
}
