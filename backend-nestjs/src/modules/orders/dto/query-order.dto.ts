import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsPositive, Max, Min } from "class-validator";

export class QueryOrderDto {
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
      "Admin không truyền = xem đơn hàng của MỌI chi nhánh.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  branch_id?: number;

  @ApiPropertyOptional({
    example: "completed",
    enum: ["completed", "cancelled"],
  })
  @IsOptional()
  @IsIn(["completed", "cancelled"], {
    message: "chỉ chấp nhận 'completed' hoặc 'cancelled'",
  })
  status?: "completed" | "cancelled";

  @ApiPropertyOptional({ example: "paid", enum: ["pending", "paid"] })
  @IsOptional()
  @IsIn(["pending", "paid"], {
    message: "chỉ chấp nhận 'pending' hoặc 'paid'",
  })
  payment_status?: "pending" | "paid";
}
