import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from "class-validator";

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

  @ApiPropertyOptional({
    example: "2026-07-01",
    description:
      "Lọc đơn từ ngày (ISO date, ví dụ: 2026-07-01). Tính từ đầu ngày (00:00:00 UTC+7).",
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: "from_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)" },
  )
  from_date?: string;

  @ApiPropertyOptional({
    example: "2026-07-15",
    description:
      "Lọc đơn đến ngày (ISO date, ví dụ: 2026-07-15). Tính đến cuối ngày (23:59:59 UTC+7).",
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: "to_date phải là định dạng ngày hợp lệ (YYYY-MM-DD)" },
  )
  to_date?: string;

  @ApiPropertyOptional({
    example: 2,
    description:
      "Lọc đơn theo nhân viên tạo. Chỉ admin mới filter được đơn của người khác. " +
      "Staff không truyền hoặc truyền ID của chính mình đều chỉ thấy đơn của mình.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @IsPositive({ message: "phải là số nguyên dương" })
  created_by?: number;
}
