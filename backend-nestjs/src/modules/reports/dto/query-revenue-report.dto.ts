import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsPositive } from "class-validator";

export class QueryRevenueReportDto {
  @ApiPropertyOptional({
    example: "2026-07-01",
    description: "Từ ngày (YYYY-MM-DD, theo UTC). Bỏ trống = không giới hạn cận dưới.",
  })
  @IsOptional()
  @IsDateString({}, { message: "phải là ngày hợp lệ (YYYY-MM-DD)" })
  from_date?: string;

  @ApiPropertyOptional({
    example: "2026-07-31",
    description: "Đến ngày (YYYY-MM-DD, theo UTC, bao gồm cả ngày này). Bỏ trống = không giới hạn cận trên.",
  })
  @IsOptional()
  @IsDateString({}, { message: "phải là ngày hợp lệ (YYYY-MM-DD)" })
  to_date?: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      "Không truyền = tổng doanh thu TOÀN HỆ THỐNG (mọi chi nhánh). Chỉ admin " +
      "mới gọi được endpoint này (RolesGuard).",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;
}
