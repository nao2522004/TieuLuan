import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class CategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "Đồ uống" })
  name: string;

  @ApiProperty({ example: "Nước ngọt, bia, nước suối...", nullable: true })
  description: string | null;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  updated_at: Date;
}

export class CategoryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CategoryDto })
  data: CategoryDto;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedCategoryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [CategoryDto] })
  data: CategoryDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}
