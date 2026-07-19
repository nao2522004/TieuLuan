import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";
import { Type } from "class-transformer";

export class CreateStocktakeDto {
  @ApiPropertyOptional({ example: "Kiểm kê hàng tháng 7" })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "Ghi chú tối đa 255 ký tự" })
  note?: string;

  @ApiPropertyOptional({ example: 1, description: "Chỉ dành cho admin để tạo cho chi nhánh bất kỳ" })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;
}
