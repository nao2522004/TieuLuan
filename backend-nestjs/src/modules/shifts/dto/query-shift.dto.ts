import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsPositive, Max, Min } from "class-validator";

export class QueryShiftDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(1, { message: "tối thiểu là 1" })
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(1, { message: "tối thiểu là 1" })
  @Max(100, { message: "tối đa là 100" })
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 1,
    description:
      "Chỉ có tác dụng với admin (staff luôn bị giới hạn theo branch_id của " +
      "chính tài khoản đang đăng nhập, bỏ qua giá trị truyền vào nếu có). " +
      "Admin không truyền = xem ca của MỌI chi nhánh.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;

  @ApiPropertyOptional({
    example: 2,
    description: "Lọc ca theo nhân viên (ID user).",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  user_id?: number;

  @ApiPropertyOptional({
    example: "open",
    enum: ["open", "closed"],
    description: "Lọc theo trạng thái ca: 'open' (đang mở) hoặc 'closed' (đã đóng).",
  })
  @IsOptional()
  @IsIn(["open", "closed"], {
    message: "chỉ chấp nhận 'open' hoặc 'closed'",
  })
  status?: "open" | "closed";
}
