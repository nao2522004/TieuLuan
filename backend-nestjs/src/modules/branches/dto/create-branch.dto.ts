import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateBranchDto {
  @ApiProperty({ example: "Chi nhánh Quận 1", maxLength: 150 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MaxLength(150, { message: "tối đa 150 ký tự" })
  name: string;

  @ApiPropertyOptional({ example: "123 Lê Lợi, Q.1, TP.HCM", maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: "tối đa 255 ký tự" })
  address?: string;

  @ApiPropertyOptional({ example: "028-1234-5678", maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: "tối đa 20 ký tự" })
  phone?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: "970422",
    maxLength: 10,
    description: "Mã BIN ngân hàng theo chuẩn Napas (VD: 970422 = MB Bank)",
  })
  @IsString()
  @IsOptional()
  @MaxLength(10, { message: "tối đa 10 ký tự" })
  bank_bin?: string;

  @ApiPropertyOptional({ example: "0123456789", maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30, { message: "tối đa 30 ký tự" })
  bank_account_no?: string;

  @ApiPropertyOptional({
    example: "NGUYEN VAN A",
    maxLength: 150,
    description: "Tên chủ tài khoản, không dấu, đúng chuẩn VietQR",
  })
  @IsString()
  @IsOptional()
  @MaxLength(150, { message: "tối đa 150 ký tự" })
  bank_account_name?: string;
}
