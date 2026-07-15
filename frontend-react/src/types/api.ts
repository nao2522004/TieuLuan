export interface PaginationMeta {
  current_page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
  trace_id: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
