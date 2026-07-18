import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
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
    example: ["leader", "cashier"],
    isArray: true,
    enum: ["admin", "leader", "cashier"],
    description:
      "Danh sách role mới — thay thế toàn bộ roles hiện tại. " +
      "Không được tự đổi role của chính mình.",
  })
  @IsOptional()
  @IsArray({ message: "phải là mảng" })
  @ArrayNotEmpty({ message: "cần ít nhất 1 role" })
  @IsIn(["admin", "leader", "cashier"], {
    each: true,
    message: "mỗi role chỉ chấp nhận 'admin', 'leader' hoặc 'cashier'",
  })
  role_codes?: string[];

  @ApiPropertyOptional({
    example: false,
    description: "false = khóa tài khoản (thu hồi toàn bộ refresh_token)",
  })
  @IsOptional()
  @IsBoolean({ message: "phải là true hoặc false" })
  is_active?: boolean;
}
