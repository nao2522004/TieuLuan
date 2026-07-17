import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "MatKhauCu@123" })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  old_password: string;

  @ApiProperty({ example: "MatKhauMoi@456", minLength: 6 })
  @IsString()
  @IsNotEmpty({ message: "không được để trống" })
  @MinLength(6, { message: "tối thiểu 6 ký tự" })
  new_password: string;
}
