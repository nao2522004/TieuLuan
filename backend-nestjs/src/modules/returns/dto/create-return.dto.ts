import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateReturnDto {
  @ApiProperty({
    example: 1,
    description: "ID dòng sản phẩm trong đơn hàng (order_items.id) cần trả",
  })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  order_item_id: number;

  @ApiProperty({
    example: 1,
    description:
      "Số lượng trả (phải > 0, không được vượt quá số lượng chưa trả trước đó " +
      "của dòng hàng này - hỗ trợ trả từng phần)",
  })
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  @IsNotEmpty({ message: "không được để trống" })
  quantity: number;

  @ApiPropertyOptional({ example: "Sản phẩm bị lỗi", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  reason?: string;
}
