import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsPositive, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateStocktakeItemDto {
  @ApiProperty({ example: 1, description: "ID sản phẩm cần kiểm" })
  @IsNotEmpty({ message: "product_id không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "product_id phải là số nguyên" })
  @IsPositive({ message: "product_id phải là số nguyên dương" })
  product_id: number;

  @ApiProperty({ example: 98, description: "Số lượng đếm thực tế" })
  @IsNotEmpty({ message: "counted_quantity không được để trống" })
  @Type(() => Number)
  @IsInt({ message: "counted_quantity phải là số nguyên" })
  @Min(0, { message: "counted_quantity phải lớn hơn hoặc bằng 0" })
  counted_quantity: number;
}

export class BulkCreateStocktakeItemDto {
  @ApiProperty({ type: [CreateStocktakeItemDto] })
  @IsNotEmpty({ message: "items không được để trống" })
  @Type(() => CreateStocktakeItemDto)
  items: CreateStocktakeItemDto[];
}
