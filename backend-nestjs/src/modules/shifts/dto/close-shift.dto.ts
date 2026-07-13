import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CloseShiftDto {
  @ApiProperty({ example: 1250000, description: "Tiền quỹ thực đếm cuối ca" })
  @Type(() => Number)
  @IsNumber({}, { message: "phải là số" })
  @Min(0, { message: "phải >= 0" })
  @IsNotEmpty({ message: "không được để trống" })
  closing_cash: number;

  @ApiPropertyOptional({ example: "Đủ quỹ", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  note?: string;
}
