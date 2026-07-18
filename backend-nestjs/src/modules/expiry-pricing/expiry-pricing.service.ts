import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { ExpiryDiscountRule } from "./entities/expiry-discount-rule.entity";
import { CreateExpiryDiscountRuleDto } from "./dto/create-expiry-discount-rule.dto";
import { UpdateExpiryDiscountRuleDto } from "./dto/update-expiry-discount-rule.dto";
import { ExpiryDiscountRuleDto } from "./dto/expiry-discount-rule-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";

export interface EffectivePriceResult {
  effective_price: number;
  discount_percent: number;
  is_expiry_discount_applied: boolean;
}

@Injectable()
export class ExpiryPricingService {
  constructor(
    @InjectRepository(ExpiryDiscountRule)
    private readonly rulesRepository: Repository<ExpiryDiscountRule>,
  ) {}

  private async getActiveRules(): Promise<ExpiryDiscountRule[]> {
    return this.rulesRepository.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { daysBeforeExpiry: "ASC" },
    });
  }

  async computeEffectivePrice(
    salePrice: number,
    expiryDate: string | null,
  ): Promise<EffectivePriceResult> {
    if (!expiryDate) {
      return {
        effective_price: salePrice,
        discount_percent: 0,
        is_expiry_discount_applied: false,
      };
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate + "T00:00:00.000Z");
    const daysLeft = Math.floor(
      (expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );

    const rules = await this.getActiveRules();
    const matching = rules.filter((r) => daysLeft <= r.daysBeforeExpiry);
    if (matching.length === 0) {
      return {
        effective_price: salePrice,
        discount_percent: 0,
        is_expiry_discount_applied: false,
      };
    }

    const bestRule = matching.reduce((max, r) =>
      Number(r.discountPercent) > Number(max.discountPercent) ? r : max,
    );

    const percent = Number(bestRule.discountPercent);
    const effectivePrice = Math.round(salePrice * (1 - percent / 100));

    return {
      effective_price: Math.max(0, effectivePrice),
      discount_percent: percent,
      is_expiry_discount_applied: true,
    };
  }

  async findAll(): Promise<ExpiryDiscountRuleDto[]> {
    const rows = await this.rulesRepository.find({
      where: { deletedAt: IsNull() },
      order: { daysBeforeExpiry: "ASC" },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(
    dto: CreateExpiryDiscountRuleDto,
  ): Promise<ExpiryDiscountRuleDto> {
    const entity = this.rulesRepository.create({
      daysBeforeExpiry: dto.days_before_expiry,
      discountPercent: dto.discount_percent,
      isActive: dto.is_active ?? true,
    });
    const saved = await this.rulesRepository.save(entity);
    return this.toDto(saved);
  }

  async update(
    id: number,
    dto: UpdateExpiryDiscountRuleDto,
  ): Promise<ExpiryDiscountRuleDto> {
    const rule = await this.findActiveOrThrow(id);
    if (dto.days_before_expiry !== undefined)
      rule.daysBeforeExpiry = dto.days_before_expiry;
    if (dto.discount_percent !== undefined)
      rule.discountPercent = dto.discount_percent;
    if (dto.is_active !== undefined) rule.isActive = dto.is_active;
    const saved = await this.rulesRepository.save(rule);
    return this.toDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const rule = await this.findActiveOrThrow(id);
    rule.deletedAt = new Date();
    await this.rulesRepository.save(rule);
    return { message: "Xóa quy tắc giảm giá cận hạn thành công." };
  }

  private async findActiveOrThrow(id: number): Promise<ExpiryDiscountRule> {
    const rule = await this.rulesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!rule) {
      throw new BusinessException(
        "EXPIRY_RULE_NOT_FOUND",
        404,
        "Không tìm thấy quy tắc giảm giá.",
      );
    }
    return rule;
  }

  private toDto(rule: ExpiryDiscountRule): ExpiryDiscountRuleDto {
    return {
      id: rule.id,
      days_before_expiry: rule.daysBeforeExpiry,
      discount_percent: Number(rule.discountPercent),
      is_active: rule.isActive,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    };
  }
}
