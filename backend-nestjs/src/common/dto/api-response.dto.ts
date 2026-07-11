import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ example: 1 })
  current_page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 150 })
  total_items: number;

  @ApiProperty({ example: 15 })
  total_pages: number;
}

export class ApiSuccessResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  data: T;

  @ApiPropertyOptional({ type: PaginationMeta })
  meta?: PaginationMeta;

  @ApiProperty({ example: '2026-07-11T10:00:00.000Z' })
  timestamp: string;
}

export class ApiError {
  @ApiProperty({ example: 'AUTH_INVALID_CREDENTIALS' })
  code: string;

  @ApiProperty({ example: 'Email hoặc mật khẩu không đúng.' })
  message: string;
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty()
  error: ApiError;

  @ApiProperty({ example: '2026-07-11T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 'req-xxxxxx' })
  trace_id: string;
}
