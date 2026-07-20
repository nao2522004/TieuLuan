import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, IsNull, Not, Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { ProductBatch } from "./entities/product-batch.entity";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductDto } from "./dto/query-product.dto";
import {
  QueryProductAlertsDto,
  QueryExpiringSoonDto,
} from "./dto/query-product-alerts.dto";
import {
  ProductDto,
  ProductDtoWithoutPricing,
} from "./dto/product-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";
import { RedisService } from "../../common/redis/redis.service";
import { BranchesService } from "../branches/branches.service";
import { CategoriesService } from "../categories/categories.service";
import { AuthUser } from "../../common/guards/jwt-auth.guard";
import { ExpiryPricingService } from "../expiry-pricing/expiry-pricing.service";
import {
  ProductBatchDto,
  UpdateProductBatchDto,
} from "./dto/product-batch.dto";

const CACHE_PREFIX = "products";

@Injectable()
export class ProductsService {
  private readonly cacheTtl: number;

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductBatch)
    private readonly productBatchRepository: Repository<ProductBatch>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly branchesService: BranchesService,
    private readonly categoriesService: CategoriesService,
    private readonly expiryPricingService: ExpiryPricingService,
  ) {
    this.cacheTtl = parseInt(
      this.configService.get<string>("REDIS_CACHE_TTL") ?? "3600",
      10,
    );
  }

  async findAll(
    query: QueryProductDto,
  ): Promise<{ data: ProductDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const cacheKey = this.buildListCacheKey(query, page, limit);

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const dataWithPricing = await Promise.all(
          parsed.data.map((dto: ProductDto) => this.toDtoWithPricing(dto)),
        );
        return { ...parsed, data: dataWithPricing };
      } catch {
        // cache hỏng/không parse được -> bỏ qua, query DB như bình thường
      }
    }

    const [rows, total] = await this.productsRepository.findAndCount({
      where: {
        deletedAt: IsNull(),
        ...(query.search ? { name: ILike(`%${query.search}%`) } : {}),
        ...(query.branch_id ? { branchId: query.branch_id } : {}),
        ...(query.category_id ? { categoryId: query.category_id } : {}),
      },
      order: { id: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = {
      data: rows.map((row) => this.toDto(row)),
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.cacheTtl,
    );

    const dataWithPricing = await Promise.all(
      result.data.map((dto) => this.toDtoWithPricing(dto)),
    );
    return { ...result, data: dataWithPricing };
  }

  async findOne(id: number): Promise<ProductDto> {
    const cacheKey = this.detailCacheKey(id);

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const dto = JSON.parse(cached);
        return this.toDtoWithPricing(dto);
      } catch {
        // fallback query DB nếu cache hỏng
      }
    }

    const product = await this.findActiveOrThrow(id);
    const dto = this.toDto(product);
    await this.redisService.set(cacheKey, JSON.stringify(dto), this.cacheTtl);

    return this.toDtoWithPricing(dto);
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    await this.branchesService.findOne(dto.branch_id);
    await this.categoriesService.findOne(dto.category_id);
    await this.assertBarcodeNotTaken(dto.branch_id, dto.barcode);

    const entity = this.productsRepository.create({
      branchId: dto.branch_id,
      categoryId: dto.category_id,
      barcode: dto.barcode,
      name: dto.name,
      unit: dto.unit,
      costPrice: dto.cost_price,
      salePrice: dto.sale_price,
      stockQuantity: dto.stock_quantity ?? 0,
      reorderLevel: dto.reorder_level ?? 10,
      expiryDate: dto.expiry_date ?? null,
    });
    const saved = await this.productsRepository.save(entity);

    await this.evictListCache();

    return this.toDtoWithPricing(saved);
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductDto> {
    const product = await this.findActiveOrThrow(id);

    if (dto.branch_id !== undefined) {
      await this.branchesService.findOne(dto.branch_id);
    }
    if (dto.category_id !== undefined) {
      await this.categoriesService.findOne(dto.category_id);
    }

    const nextBranchId = dto.branch_id ?? product.branchId;
    const nextBarcode = dto.barcode ?? product.barcode;
    const barcodeOrBranchChanged =
      (dto.barcode !== undefined && dto.barcode !== product.barcode) ||
      (dto.branch_id !== undefined && dto.branch_id !== product.branchId);

    if (barcodeOrBranchChanged) {
      await this.assertBarcodeNotTaken(nextBranchId, nextBarcode, id);
    }

    if (dto.branch_id !== undefined) product.branchId = dto.branch_id;
    if (dto.category_id !== undefined) product.categoryId = dto.category_id;
    if (dto.barcode !== undefined) product.barcode = dto.barcode;
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.unit !== undefined) product.unit = dto.unit;
    if (dto.cost_price !== undefined) product.costPrice = dto.cost_price;
    if (dto.sale_price !== undefined) product.salePrice = dto.sale_price;
    if (dto.stock_quantity !== undefined)
      product.stockQuantity = dto.stock_quantity;
    if (dto.reorder_level !== undefined)
      product.reorderLevel = dto.reorder_level;
    if (dto.expiry_date !== undefined) product.expiryDate = dto.expiry_date;

    const saved = await this.productsRepository.save(product);

    // Evict cache
    await this.evictDetailCache(id);
    await this.evictListCache();

    return this.toDtoWithPricing(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findActiveOrThrow(id);
    product.deletedAt = new Date();
    await this.productsRepository.save(product);

    await this.evictDetailCache(id);
    await this.evictListCache();

    return { message: "Xóa sản phẩm thành công." };
  }

  // Barcode Lookup
  async findByBarcode(
    barcode: string,
    user: AuthUser,
    queryBranchId?: number,
  ): Promise<ProductDto> {
    const branchId = this.resolveBranchId(user, queryBranchId);

    const product = await this.productsRepository.findOne({
      where: { barcode, branchId, deletedAt: IsNull() },
    });

    if (!product) {
      throw new BusinessException(
        "PRODUCT_NOT_FOUND",
        404,
        "Không tìm thấy sản phẩm với barcode này.",
      );
    }

    return this.toDtoWithPricing(this.toDto(product));
  }

  // Cảnh báo tồn thấp / sắp hết hạn
  async findAlerts(
    user: AuthUser,
    queryBranchId?: number,
  ): Promise<{ low_stock: ProductDto[]; expiring_soon: ProductDto[] }> {
    const branchId = this.resolveBranchId(user, queryBranchId);
    const alertDays = this.getExpiryAlertDays();

    const lowStockRows = await this.productsRepository
      .createQueryBuilder("p")
      .where("p.branch_id = :branchId", { branchId })
      .andWhere("p.deleted_at IS NULL")
      .andWhere("p.stock_quantity <= p.reorder_level")
      .orderBy("p.stock_quantity", "ASC")
      .getMany();

    // Query trực tiếp từ product_batches để lấy lô cận hạn theo từng lô
    // (không dùng products.expiry_date cũ, không dùng cache)
    const expiringSoonBatches = await this.productBatchRepository
      .createQueryBuilder("pb")
      .innerJoin(Product, "p", "pb.product_id = p.id")
      .select([
        "pb.id AS batch_id",
        "pb.product_id AS product_id",
        "pb.batch_code AS batch_code",
        "pb.expiry_date AS expiry_date",
        "pb.quantity_remaining AS quantity_remaining",
        "p.name AS product_name",
        "p.barcode AS barcode",
        "p.unit AS unit",
      ])
      .where("p.branch_id = :branchId", { branchId })
      .andWhere("p.deleted_at IS NULL")
      .andWhere("pb.deleted_at IS NULL")
      .andWhere("pb.quantity_remaining > 0")
      .andWhere("pb.expiry_date IS NOT NULL")
      .andWhere(
        "pb.expiry_date <= (CURRENT_DATE + make_interval(days => :alertDays))",
        { alertDays },
      )
      .orderBy("pb.expiry_date", "ASC")
      .getRawMany();

    return {
      low_stock: await Promise.all(
        lowStockRows.map((row) => this.toDtoWithPricing(this.toDto(row))),
      ),
      expiring_soon: expiringSoonBatches,
    };
  }

  async findLowStockPaginated(
    query: QueryProductAlertsDto,
    user: AuthUser,
  ): Promise<{ data: ProductDto[]; meta: PaginationMeta }> {
    const branchId = this.resolveBranchId(user, query.branch_id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.productsRepository
      .createQueryBuilder("p")
      .where("p.branch_id = :branchId", { branchId })
      .andWhere("p.deleted_at IS NULL")
      .andWhere("p.stock_quantity <= p.reorder_level")
      .orderBy("p.stock_quantity", "ASC");

    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      rows.map((row) => this.toDtoWithPricing(row)),
    );

    return {
      data,
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findExpiringSoonPaginated(
    query: QueryExpiringSoonDto,
    user: AuthUser,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    const branchId = this.resolveBranchId(user, query.branch_id);
    const alertDays = query.days ?? this.getExpiryAlertDays();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    // Query trực tiếp từ product_batches để lấy lô cận hạn theo từng lô
    const qb = this.productBatchRepository
      .createQueryBuilder("pb")
      .innerJoin(Product, "p", "pb.product_id = p.id")
      .select([
        "pb.id AS batch_id",
        "pb.product_id AS product_id",
        "pb.batch_code AS batch_code",
        "pb.expiry_date AS expiry_date",
        "pb.quantity_remaining AS quantity_remaining",
        "p.name AS product_name",
        "p.barcode AS barcode",
        "p.unit AS unit",
        "p.sale_price AS sale_price",
      ])
      .where("p.branch_id = :branchId", { branchId })
      .andWhere("p.deleted_at IS NULL")
      .andWhere("pb.deleted_at IS NULL")
      .andWhere("pb.quantity_remaining > 0")
      .andWhere("pb.expiry_date IS NOT NULL")
      .andWhere(
        "pb.expiry_date <= (CURRENT_DATE + make_interval(days => :alertDays))",
        { alertDays },
      )
      .orderBy("pb.expiry_date", "ASC");

    const total = await qb.getCount();
    const data = await qb.offset(offset).limit(limit).getRawMany();

    return {
      data,
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  private getExpiryAlertDays(): number {
    return parseInt(
      this.configService.get<string>("PRODUCT_EXPIRY_ALERT_DAYS") ?? "7",
      10,
    );
  }

  private resolveBranchId(user: AuthUser, queryBranchId?: number): number {
    const branchId = queryBranchId ?? user.branchId ?? null;
    if (!branchId) {
      throw new BusinessException(
        "PRODUCT_BRANCH_REQUIRED",
        400,
        "branch_id: bắt buộc khi tài khoản không gắn với 1 chi nhánh cụ thể",
      );
    }
    return branchId;
  }

  private async findActiveOrThrow(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!product) {
      throw new BusinessException(
        "PRODUCT_NOT_FOUND",
        404,
        "Không tìm thấy sản phẩm.",
      );
    }
    return product;
  }

  private async assertBarcodeNotTaken(
    branchId: number,
    barcode: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.productsRepository.findOne({
      where: {
        branchId,
        barcode,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
    if (existing) {
      throw new BusinessException(
        "PRODUCT_BARCODE_DUPLICATE",
        409,
        "Barcode đã tồn tại trong chi nhánh này.",
      );
    }
  }

  private toDto(product: Product): ProductDtoWithoutPricing {
    return {
      id: product.id,
      branch_id: product.branchId,
      category_id: product.categoryId,
      barcode: product.barcode,
      name: product.name,
      unit: product.unit,
      cost_price: product.costPrice,
      sale_price: product.salePrice,
      stock_quantity: product.stockQuantity,
      reorder_level: product.reorderLevel,
      expiry_date: product.expiryDate,
      nearest_expiry_date: product.nearestExpiryDate ?? null,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  private async toDtoWithPricing(
    product: Product | ProductDtoWithoutPricing,
  ): Promise<ProductDto> {
    const base: ProductDtoWithoutPricing =
      "createdAt" in product ? this.toDto(product as Product) : product;

    // Dùng nearest_expiry_date để tính giá cận hạn chính xác theo lô
    const pricing = await this.expiryPricingService.computeEffectivePrice(
      base.sale_price,
      base.nearest_expiry_date ?? null,
    );

    return {
      ...base,
      effective_price: pricing.effective_price,
      discount_percent: pricing.discount_percent,
      is_expiry_discount_applied: pricing.is_expiry_discount_applied,
    };
  }

  private detailCacheKey(id: number): string {
    return `${CACHE_PREFIX}:detail:${id}`;
  }

  private buildListCacheKey(
    query: QueryProductDto,
    page: number,
    limit: number,
  ): string {
    return [
      CACHE_PREFIX,
      "list",
      `p${page}`,
      `l${limit}`,
      `s${query.search ?? ""}`,
      `b${query.branch_id ?? ""}`,
      `c${query.category_id ?? ""}`,
    ].join(":");
  }

  async evictCacheForProduct(id: number): Promise<void> {
    await this.evictDetailCache(id);
    await this.evictListCache();
  }

  private async evictDetailCache(id: number): Promise<void> {
    await this.redisService.del(this.detailCacheKey(id));
  }

  private async evictListCache(): Promise<void> {
    const keys = await this.redisService.keys(`${CACHE_PREFIX}:list:*`);
    if (keys.length > 0) {
      await this.redisService.del(...keys);
    }
  }

  //  Batch management
  async findBatchesByProduct(productId: number): Promise<ProductBatchDto[]> {
    await this.findActiveOrThrow(productId);

    const batches = await this.productBatchRepository.find({
      where: { productId, deletedAt: IsNull() },
      order: { expiryDate: "ASC", id: "ASC" },
    });

    return batches.map((b) => ({
      id: b.id,
      product_id: b.productId,
      batch_code: b.batchCode,
      expiry_date: b.expiryDate ?? null,
      quantity_received: b.quantityReceived,
      quantity_remaining: b.quantityRemaining,
      unit_cost: b.unitCost ?? null,
      received_at: b.receivedAt,
      created_by: b.createdBy ?? null,
    }));
  }

  async updateBatch(
    batchId: number,
    dto: UpdateProductBatchDto,
  ): Promise<ProductBatchDto> {
    const batch = await this.productBatchRepository.findOne({
      where: { id: batchId, deletedAt: IsNull() },
    });

    if (!batch) {
      throw new BusinessException(
        "BATCH_NOT_FOUND",
        404,
        "Không tìm thấy lô hàng.",
      );
    }

    if (dto.batch_code !== undefined && dto.batch_code.trim() !== "") {
      batch.batchCode = dto.batch_code.trim();
    }
    if (dto.expiry_date !== undefined) {
      batch.expiryDate = dto.expiry_date ?? null;
    }
    if (dto.unit_cost !== undefined) {
      batch.unitCost = dto.unit_cost ?? null;
    }

    const saved = await this.productBatchRepository.save(batch);

    await this.dataSource.query(
      `UPDATE products
     SET nearest_expiry_date = (
       SELECT MIN(expiry_date)
       FROM product_batches
       WHERE product_id = $1
         AND quantity_remaining > 0
         AND expiry_date IS NOT NULL
         AND deleted_at IS NULL
     )
     WHERE id = $1`,
      [saved.productId],
    );

    return {
      id: saved.id,
      product_id: saved.productId,
      batch_code: saved.batchCode,
      expiry_date: saved.expiryDate ?? null,
      quantity_received: saved.quantityReceived,
      quantity_remaining: saved.quantityRemaining,
      unit_cost: saved.unitCost ?? null,
      received_at: saved.receivedAt,
      created_by: saved.createdBy ?? null,
    };
  }
}
