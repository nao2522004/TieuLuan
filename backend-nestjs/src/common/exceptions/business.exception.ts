import { HttpException } from "@nestjs/common";

export class BusinessException extends HttpException {
  public readonly errorCode: string;

  constructor(errorCode: string, statusCode: number, message: string) {
    super({ errorCode, message }, statusCode);
    this.errorCode = errorCode;
  }
}
