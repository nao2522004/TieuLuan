import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "Đồ uống", maxLength: 150 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(150, { message: "tối đa 150 ký tự" })
  name: string;

  @ApiPropertyOptional({
    example: "Nước ngọt, bia, nước suối...",
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
