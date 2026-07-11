import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { BusinessException } from "../exceptions/business.exception";
import { ApiErrorResponse } from "../dto/api-response.dto";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = request.requestId ?? randomUUID();

    const { status, code, message, isInternal } = this.resolve(exception);

    if (isInternal) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.url} -> ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${traceId}] ${request.method} ${request.url} -> ${code}: ${message}`,
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
      trace_id: traceId,
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    isInternal: boolean;
  } {
    if (exception instanceof BusinessException) {
      const res = exception.getResponse() as {
        errorCode: string;
        message: string;
      };
      return {
        status: exception.getStatus(),
        code: res.errorCode,
        message: res.message,
        isInternal: false,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === "string"
          ? res
          : (((res as { message?: string | string[] })?.message as string) ??
            exception.message);
      return {
        status,
        code: this.defaultCodeForStatus(status),
        message: Array.isArray(message) ? message.join(", ") : message,
        isInternal: false,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_ERROR",
      message: "Đã có lỗi xảy ra ở hệ thống. Vui lòng thử lại sau.",
      isInternal: true,
    };
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "VALIDATION_ERROR";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      default:
        return "INTERNAL_ERROR";
    }
  }
}
