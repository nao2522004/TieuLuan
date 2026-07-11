import { ApiProperty } from '@nestjs/swagger';

export class PublicUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Quản trị viên' })
  full_name: string;

  @ApiProperty({ example: 'admin@store.local' })
  email: string;

  @ApiProperty({ example: 'admin' })
  role: string;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: 1, nullable: true, description: 'ID chi nhánh — null nếu là admin toàn hệ thống' })
  branch_id: number | null;

  @ApiProperty({ example: '2026-07-11T10:00:00.000Z' })
  created_at: Date;
}

export class LoginDataDto {
  @ApiProperty()
  user: PublicUserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: '9f1c2e4b7a...(hex 96 ký tự)' })
  refresh_token: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: LoginDataDto;

  @ApiProperty({ example: '2026-07-11T10:00:00.000Z' })
  timestamp: string;
}
