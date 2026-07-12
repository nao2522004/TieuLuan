import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { BusinessException } from "../exceptions/business.exception";

@Injectable()
export class ParseIntIdPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const field = metadata.data ?? "id";
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BusinessException(
        "VALIDATION_ERROR",
        400,
        `${field}: phải là số nguyên dương`,
      );
    }

    return parsed;
  }
}
