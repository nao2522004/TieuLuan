import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class ProductBranchScopeDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      "Chỉ cần truyền khi tài khoản (thường là admin) không gắn cố định với 1 chi nhánh " +
      "(branch_id = null). Nhân viên chi nhánh (staff) mặc định dùng branch_id của chính " +
      "tài khoản đang đăng nhập, không cần truyền.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "phải là số nguyên" })
  @Min(1, { message: "tối thiểu là 1" })
  branch_id?: number;
}
