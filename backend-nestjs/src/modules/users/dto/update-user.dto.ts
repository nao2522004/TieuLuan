import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Nguyễn Văn A", maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: "tối đa 150 ký tự" })
  full_name?: string;

  @ApiPropertyOptional({
    example: 1,
    description: "Chuyển nhân viên sang chi nhánh khác",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;

  @ApiPropertyOptional({
    example: "leader",
    enum: ["admin", "leader", "cashier"],
    description: "Không được tự đổi role của chính mình",
  })
  @IsOptional()
  @IsIn(["admin", "leader", "cashier"], {
    message: "chỉ chấp nhận 'admin', 'leader' hoặc 'cashier'",
  })
  role_code?: string;

  @ApiPropertyOptional({
    example: false,
    description: "false = khóa tài khoản (thu hồi toàn bộ refresh_token)",
  })
  @IsOptional()
  @IsBoolean({ message: "phải là true hoặc false" })
  is_active?: boolean;
}
