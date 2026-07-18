import { PartialType } from "@nestjs/swagger";
import { CreateExpiryDiscountRuleDto } from "./create-expiry-discount-rule.dto";

export class UpdateExpiryDiscountRuleDto extends PartialType(
  CreateExpiryDiscountRuleDto,
) {}
