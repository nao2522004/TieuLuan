import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "Nguyễn Văn A", maxLength: 150 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(150, { message: "tối đa 150 ký tự" })
  full_name: string;

  @ApiProperty({ example: "cashier3@store.local" })
  @IsNotEmpty({ message: "không được để trống" })
  @IsEmail({}, { message: "phải là email hợp lệ" })
  email: string;

  @ApiProperty({ example: "MatKhau@123", minLength: 6 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MinLength(6, { message: "tối thiểu 6 ký tự" })
  password: string;

  @ApiPropertyOptional({
    example: 1,
    description: "ID chi nhánh — bỏ trống nếu là admin toàn hệ thống",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;

  @ApiPropertyOptional({
    example: ["cashier"],
    description:
      "Danh sách role codes — 1 user có thể có nhiều role đồng thời. " +
      "Mặc định ['cashier'] nếu không truyền.",
    isArray: true,
    enum: ["admin", "leader", "cashier"],
    default: ["cashier"],
  })
  @IsOptional()
  @IsArray({ message: "phải là mảng" })
  @ArrayNotEmpty({ message: "cần ít nhất 1 role" })
  @IsIn(["admin", "leader", "cashier"], {
    each: true,
    message: "mỗi role chỉ chấp nhận 'admin', 'leader' hoặc 'cashier'",
  })
  role_codes?: string[];
}
