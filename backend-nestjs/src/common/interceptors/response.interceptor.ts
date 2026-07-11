import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ApiSuccessResponse, PaginationMeta } from "../dto/api-response.dto";

interface RawPayload<T> {
  data: T;
  meta?: PaginationMeta;
}

function hasMeta<T>(payload: unknown): payload is RawPayload<T> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    "meta" in payload
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        const timestamp = new Date().toISOString();
        if (hasMeta<T>(payload)) {
          return {
            success: true,
            data: payload.data,
            meta: payload.meta,
            timestamp,
          };
        }
        return { success: true, data: payload, timestamp };
      }),
    );
  }
}
