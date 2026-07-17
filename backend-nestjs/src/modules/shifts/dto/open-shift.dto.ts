import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  IsArray,
} from "class-validator";

export class OpenShiftDto {
  @ApiProperty({ example: 500000, description: "Tiền quỹ đầu ca" })
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  @IsNotEmpty({ message: "không được để trống" })
  opening_cash: number;

  @ApiPropertyOptional({
    example: [2, 3],
    description:
      "Danh sách ID thu ngân được gán vào ca làm việc (tuỳ chọn, có thể để trống). " +
      "Trưởng ca có thể mở ca một mình mà không cần thêm thu ngân.",
  })
  @IsOptional()
  @IsArray({ message: "phải là mảng" })
  @IsInt({ each: true, message: "ID thu ngân phải là số nguyên" })
  @IsPositive({ each: true, message: "ID thu ngân phải là số dương" })
  cashier_ids?: number[];

  @ApiPropertyOptional({
    example: 1,
    description:
      "Chỉ cần truyền khi tài khoản (thường là admin) không gắn cố định với 1 chi nhánh. " +
      "Nhân viên chi nhánh (staff) mặc định dùng branch_id của chính tài khoản đang đăng nhập.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;

  @ApiPropertyOptional({ example: "Ca sáng", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  note?: string;
}
