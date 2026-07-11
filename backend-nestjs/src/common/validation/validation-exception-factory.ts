import { ValidationError } from "@nestjs/common";
import { BusinessException } from "../exceptions/business.exception";

export function validationExceptionFactory(
  errors: ValidationError[],
): BusinessException {
  const message = flattenErrors(errors).join(", ");
  return new BusinessException("VALIDATION_ERROR", 400, message);
}

function flattenErrors(errors: ValidationError[], parentPath = ""): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      const reasons = Object.values(error.constraints).join("; ");
      messages.push(`${path}: ${reasons}`);
    }

    if (error.children && error.children.length > 0) {
      messages.push(...flattenErrors(error.children, path));
    }
  }

  return messages;
}
