import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@store.local', description: 'Tài khoản seed sẵn' })
  @IsNotEmpty({ message: 'không được để trống' })
  @IsEmail({}, { message: 'phải là email hợp lệ' })
  email: string;

  @ApiProperty({ example: 'Admin@123', description: 'Tài khoản seed sẵn' })
  @IsString()
  @IsNotEmpty({ message: 'không được để trống' })
  password: string;
}
