import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateClosingDto {
  @ApiPropertyOptional({
    example: 1300000,
    description: "Tiền quỹ thực đếm lại (sửa sau khi đóng ca nhỡ nhập sai)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  closing_cash?: number;

  @ApiPropertyOptional({
    example: "Ca sáng, đủ quỹ",
    maxLength: 255,
    description: "Ghi chú đóng ca (có thể sửa lại)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  note?: string;
}
