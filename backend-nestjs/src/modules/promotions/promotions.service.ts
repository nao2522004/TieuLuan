import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Raw, Repository } from "typeorm";
import { Promotion } from "./entities/promotion.entity";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import { QueryPromotionsDto } from "./dto/query-promotions.dto";
import { PromotionDto } from "./dto/promotion-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionsRepository: Repository<Promotion>,
  ) {}

  async create(dto: CreatePromotionDto): Promise<PromotionDto> {
    const cleanCode = dto.code.trim().toUpperCase();
    await this.assertCodeNotTaken(cleanCode);

    // Validate type-specific constraints
    if (dto.type === "percent" && dto.value > 100) {
      throw new BusinessException(
        "PROMOTION_INVALID_VALUE",
        400,
        "Khuyến mãi theo phần trăm thì giá trị phải từ 1 đến 100.",
      );
    }

    if (dto.ends_at && dto.starts_at && new Date(dto.ends_at) <= new Date(dto.starts_at)) {
      throw new BusinessException(
        "PROMOTION_INVALID_DATES",
        400,
        "Thời gian kết thúc phải sau thời gian bắt đầu.",
      );
    }

    const entity = this.promotionsRepository.create({
      code: cleanCode,
      name: dto.name,
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.min_order_amount ?? null,
      maxDiscountAmount: dto.max_discount_amount ?? null,
      isActive: dto.is_active ?? true,
      startsAt: dto.starts_at ?? new Date(),
      endsAt: dto.ends_at ?? null,
    });

    const saved = await this.promotionsRepository.save(entity);
    return this.toDto(saved);
  }

  async findAllPaginated(
    query: QueryPromotionsDto,
  ): Promise<{ data: PromotionDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.promotionsRepository
      .createQueryBuilder("p")
      .where("p.deleted_at IS NULL");

    if (query.is_active !== undefined) {
      qb.andWhere("p.is_active = :isActive", { isActive: query.is_active });
    }

    qb.orderBy("p.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((r) => this.toDto(r)),
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOneOrThrow(id: number): Promise<PromotionDto> {
    const promotion = await this.findActiveOrThrow(id);
    return this.toDto(promotion);
  }

  async update(id: number, dto: UpdatePromotionDto): Promise<PromotionDto> {
    const promotion = await this.findActiveOrThrow(id);

    if (dto.code !== undefined) {
      const cleanCode = dto.code.trim().toUpperCase();
      if (cleanCode !== promotion.code) {
        await this.assertCodeNotTaken(cleanCode, id);
        promotion.code = cleanCode;
      }
    }

    if (dto.name !== undefined) promotion.name = dto.name;
    if (dto.type !== undefined) promotion.type = dto.type;
    if (dto.value !== undefined) promotion.value = dto.value;
    if (dto.min_order_amount !== undefined)
      promotion.minOrderAmount = dto.min_order_amount;
    if (dto.max_discount_amount !== undefined)
      promotion.maxDiscountAmount = dto.max_discount_amount;
    if (dto.is_active !== undefined) promotion.isActive = dto.is_active;
    if (dto.starts_at !== undefined) promotion.startsAt = dto.starts_at;
    if (dto.ends_at !== undefined) promotion.endsAt = dto.ends_at;

    // Validate type-specific constraints
    if (promotion.type === "percent" && promotion.value > 100) {
      throw new BusinessException(
        "PROMOTION_INVALID_VALUE",
        400,
        "Khuyến mãi theo phần trăm thì giá trị phải từ 1 đến 100.",
      );
    }

    if (promotion.endsAt && promotion.startsAt && promotion.endsAt <= promotion.startsAt) {
      throw new BusinessException(
        "PROMOTION_INVALID_DATES",
        400,
        "Thời gian kết thúc phải sau thời gian bắt đầu.",
      );
    }

    const saved = await this.promotionsRepository.save(promotion);
    return this.toDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const promotion = await this.findActiveOrThrow(id);
    promotion.deletedAt = new Date();
    await this.promotionsRepository.save(promotion);
    return { message: "Xóa chương trình khuyến mãi thành công." };
  }

  /**
   * Kiểm tra và tính toán giảm giá cho mã khuyến mãi tại POS
   */
  async validateAndCalculateDiscount(
    code: string,
    orderAmount: number,
  ): Promise<{ valid: boolean; discount_amount: number; reason: string | null }> {
    const cleanCode = code.trim().toUpperCase();
    const promotion = await this.promotionsRepository.findOne({
      where: {
        code: cleanCode,
        deletedAt: IsNull(),
      },
    });

    if (!promotion) {
      return { valid: false, discount_amount: 0, reason: "Mã khuyến mãi không tồn tại." };
    }

    if (!promotion.isActive) {
      return { valid: false, discount_amount: 0, reason: "Chương trình khuyến mãi đã bị vô hiệu hóa." };
    }

    const now = new Date();
    if (now < promotion.startsAt) {
      return { valid: false, discount_amount: 0, reason: "Chương trình khuyến mãi chưa bắt đầu." };
    }

    if (promotion.endsAt && now > promotion.endsAt) {
      return { valid: false, discount_amount: 0, reason: "Chương trình khuyến mãi đã hết hạn." };
    }

    const minAmount = promotion.minOrderAmount ? Number(promotion.minOrderAmount) : 0;
    if (orderAmount < minAmount) {
      return {
        valid: false,
        discount_amount: 0,
        reason: `Đơn hàng chưa đạt giá trị tối thiểu (${minAmount.toLocaleString()}đ) để áp dụng mã.`,
      };
    }

    let discount = 0;
    const value = Number(promotion.value);

    if (promotion.type === "fixed") {
      discount = value;
    } else if (promotion.type === "percent") {
      discount = (value / 100) * orderAmount;
      if (promotion.maxDiscountAmount) {
        const maxDiscount = Number(promotion.maxDiscountAmount);
        discount = Math.min(discount, maxDiscount);
      }
    }

    // Số tiền giảm không được vượt quá tổng giá trị đơn hàng
    discount = Math.min(discount, orderAmount);

    return {
      valid: true,
      discount_amount: discount,
      reason: null,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async findActiveOrThrow(id: number): Promise<Promotion> {
    const promotion = await this.promotionsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!promotion) {
      throw new BusinessException(
        "PROMOTION_NOT_FOUND",
        404,
        "Không tìm thấy chương trình khuyến mãi.",
      );
    }
    return promotion;
  }

  private async assertCodeNotTaken(code: string, excludeId?: number): Promise<void> {
    const qb = this.promotionsRepository
      .createQueryBuilder("p")
      .where("p.code = :code", { code })
      .andWhere("p.deleted_at IS NULL");

    if (excludeId !== undefined) {
      qb.andWhere("p.id <> :excludeId", { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new BusinessException(
        "PROMOTION_CODE_DUPLICATE",
        409,
        "Mã khuyến mãi này đã tồn tại.",
      );
    }
  }

  private toDto(promotion: Promotion): PromotionDto {
    return {
      id: promotion.id,
      code: promotion.code,
      name: promotion.name,
      type: promotion.type,
      value: Number(promotion.value),
      min_order_amount: promotion.minOrderAmount ? Number(promotion.minOrderAmount) : null,
      max_discount_amount: promotion.maxDiscountAmount ? Number(promotion.maxDiscountAmount) : null,
      is_active: promotion.isActive,
      starts_at: promotion.startsAt,
      ends_at: promotion.endsAt,
      created_at: promotion.createdAt,
      updated_at: promotion.updatedAt,
    };
  }
}
