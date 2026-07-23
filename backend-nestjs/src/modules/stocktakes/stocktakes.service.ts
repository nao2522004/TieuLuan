import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, IsNull } from "typeorm";
import { Stocktake } from "./entities/stocktake.entity";
import { StocktakeItem } from "./entities/stocktake-item.entity";
import { Product } from "../products/entities/product.entity";
import { InventoryTransaction } from "../inventory/entities/inventory-transaction.entity";
import { CreateStocktakeDto } from "./dto/create-stocktake.dto";
import { CreateStocktakeItemDto } from "./dto/create-stocktake-item.dto";
import { QueryStocktakesDto } from "./dto/query-stocktakes.dto";
import { StocktakeDto, StocktakeItemDto } from "./dto/stocktake-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { AuthUser } from "../../common/guards/jwt-auth.guard";
import { PaginationMeta } from "../../common/dto/api-response.dto";
import { ProductsService } from "../products/products.service";
import { BatchConsumptionService } from "../products/batch-consumption.service";

interface RawUpsertRow {
  id: string;
  stocktake_id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
}

@Injectable()
export class StocktakesService {
  constructor(
    @InjectRepository(Stocktake)
    private readonly stocktakeRepository: Repository<Stocktake>,
    @InjectRepository(StocktakeItem)
    private readonly itemRepository: Repository<StocktakeItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
    private readonly batchConsumptionService: BatchConsumptionService,
  ) {}

  async create(dto: CreateStocktakeDto, user: AuthUser): Promise<StocktakeDto> {
    const branchId = dto.branch_id ?? user.branchId;
    if (!branchId) {
      throw new BusinessException(
        "STOCKTAKE_BRANCH_REQUIRED",
        400,
        "branch_id: bắt buộc khi tài khoản không gắn với 1 chi nhánh cụ thể",
      );
    }

    if (!user.roles.includes("admin") && branchId !== user.branchId) {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền mở phiên kiểm kê cho chi nhánh khác.",
      );
    }

    const existing = await this.stocktakeRepository.findOne({
      where: { branchId, status: "open" },
    });
    if (existing) {
      throw new BusinessException(
        "STOCKTAKE_ALREADY_OPEN",
        400,
        "Chi nhánh này đang có một phiên kiểm kê chưa đóng.",
      );
    }

    const stocktake = this.stocktakeRepository.create({
      branchId,
      createdBy: user.id,
      status: "open",
      note: dto.note ?? null,
    });

    const saved = await this.stocktakeRepository.save(stocktake);
    return this.toDto(saved);
  }

  async recordItem(
    stocktakeId: number,
    dto: CreateStocktakeItemDto,
    user: AuthUser,
  ): Promise<StocktakeItemDto> {
    return this.dataSource.transaction(async (manager) => {
      const stocktakeRepo = manager.getRepository(Stocktake);

      const stocktake = await stocktakeRepo
        .createQueryBuilder("s")
        .setLock("pessimistic_write")
        .where("s.id = :id", { id: stocktakeId })
        .getOne();

      if (!stocktake) {
        throw new BusinessException(
          "STOCKTAKE_NOT_FOUND",
          404,
          "Không tìm thấy phiên kiểm kê.",
        );
      }

      if (stocktake.status !== "open") {
        throw new BusinessException(
          "STOCKTAKE_CLOSED",
          400,
          "Phiên kiểm kê đã đóng.",
        );
      }

      if (
        !user.roles.includes("admin") &&
        stocktake.branchId !== user.branchId
      ) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền thao tác trên phiên kiểm kê của chi nhánh khác.",
        );
      }

      const product = await manager.getRepository(Product).findOne({
        where: { id: dto.product_id, deletedAt: IsNull() },
      });

      if (!product) {
        throw new BusinessException(
          "PRODUCT_NOT_FOUND",
          404,
          "Không tìm thấy sản phẩm hoặc sản phẩm đã bị xóa.",
        );
      }

      if (product.branchId !== stocktake.branchId) {
        throw new BusinessException(
          "PRODUCT_BRANCH_MISMATCH",
          400,
          "Sản phẩm không thuộc chi nhánh của phiên kiểm kê.",
        );
      }

      const rows = await manager.query<RawUpsertRow[]>(
        `
        INSERT INTO stocktake_items
          (stocktake_id, product_id, system_quantity, counted_quantity, difference)
        VALUES ($1, $2, $3, $4, $4 - $3)
        ON CONFLICT (stocktake_id, product_id)
        DO UPDATE SET
          counted_quantity = EXCLUDED.counted_quantity,
          difference = EXCLUDED.counted_quantity - stocktake_items.system_quantity
        RETURNING id, stocktake_id, product_id, system_quantity, counted_quantity, difference
        `,
        [
          stocktakeId,
          dto.product_id,
          product.stockQuantity,
          dto.counted_quantity,
        ],
      );

      const row = rows[0];
      return {
        id: parseInt(row.id, 10),
        stocktake_id: parseInt(row.stocktake_id, 10),
        product_id: parseInt(row.product_id, 10),
        system_quantity: row.system_quantity,
        counted_quantity: row.counted_quantity,
        difference: row.difference,
      };
    });
  }

  async removeItem(
    stocktakeId: number,
    itemId: number,
    user: AuthUser,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const stocktakeRepo = manager.getRepository(Stocktake);

      const stocktake = await stocktakeRepo
        .createQueryBuilder("s")
        .setLock("pessimistic_write")
        .where("s.id = :id", { id: stocktakeId })
        .getOne();

      if (!stocktake) {
        throw new BusinessException(
          "STOCKTAKE_NOT_FOUND",
          404,
          "Không tìm thấy phiên kiểm kê.",
        );
      }

      if (stocktake.status !== "open") {
        throw new BusinessException(
          "STOCKTAKE_CLOSED",
          400,
          "Phiên kiểm kê đã đóng, không thể xóa dòng đếm.",
        );
      }

      if (
        !user.roles.includes("admin") &&
        stocktake.branchId !== user.branchId
      ) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền thao tác trên phiên kiểm kê của chi nhánh khác.",
        );
      }

      const itemRepo = manager.getRepository(StocktakeItem);
      const item = await itemRepo.findOne({
        where: { id: itemId, stocktakeId },
      });

      if (!item) {
        throw new BusinessException(
          "STOCKTAKE_ITEM_NOT_FOUND",
          404,
          "Không tìm thấy dòng đếm này trong phiên kiểm kê.",
        );
      }

      await itemRepo.remove(item);
    });
  }

  async close(stocktakeId: number, user: AuthUser): Promise<StocktakeDto> {
    const skippedItems: { product_id: number; reason: string }[] = [];

    const savedStocktake = await this.dataSource.transaction(
      async (manager) => {
        const stocktakeRepo = manager.getRepository(Stocktake);
        const itemRepo = manager.getRepository(StocktakeItem);
        const productRepo = manager.getRepository(Product);
        const txRepo = manager.getRepository(InventoryTransaction);

        const stocktake = await stocktakeRepo
          .createQueryBuilder("s")
          .setLock("pessimistic_write")
          .where("s.id = :id", { id: stocktakeId })
          .getOne();

        if (!stocktake) {
          throw new BusinessException(
            "STOCKTAKE_NOT_FOUND",
            404,
            "Không tìm thấy phiên kiểm kê.",
          );
        }

        if (stocktake.status !== "open") {
          throw new BusinessException(
            "STOCKTAKE_CLOSED",
            400,
            "Phiên kiểm kê đã đóng.",
          );
        }

        if (
          !user.roles.includes("admin") &&
          stocktake.branchId !== user.branchId
        ) {
          throw new BusinessException(
            "FORBIDDEN",
            403,
            "Bạn không có quyền chốt phiên kiểm kê của chi nhánh khác.",
          );
        }

        const items = await itemRepo.find({ where: { stocktakeId } });

        const sortedItems = [...items].sort(
          (a, b) => a.productId - b.productId,
        );

        for (const item of sortedItems) {
          const product = await productRepo
            .createQueryBuilder("p")
            .setLock("pessimistic_write")
            .where("p.id = :id", { id: item.productId })
            .getOne();

          if (!product || product.deletedAt) {
            skippedItems.push({
              product_id: item.productId,
              reason:
                "Sản phẩm đã bị xóa (hoặc không còn tồn tại) sau khi đếm — bỏ qua điều chỉnh tồn kho cho dòng này.",
            });
            continue;
          }

          if (item.difference === 0) {
            continue;
          }

          if (item.difference < 0) {
            const consumed = await this.batchConsumptionService.consumeFefo(
              manager,
              item.productId,
              Math.abs(item.difference),
            );

            for (const c of consumed) {
              const tx = txRepo.create({
                productId: item.productId,
                type: "OUT",
                source: "STOCKTAKE",
                reason: `Chênh lệch kiểm kê (phiên #${stocktake.id})`,
                quantity: c.quantityTaken,
                unitCost: null,
                batchId: c.batchId,
                note: stocktake.note
                  ? `Phiên kiểm kê #${stocktake.id}: ${stocktake.note}`
                  : `Phiên kiểm kê #${stocktake.id}`,
                createdBy: user.id,
              });
              await txRepo.save(tx);
            }
          } else {
            const batch = await this.batchConsumptionService.receiveBatch(
              manager,
              item.productId,
              item.difference,
              null,
              0,
              user.id,
              `LÔ-KIỂMKÊ-${stocktake.id}-${item.productId}`,
            );

            const tx = txRepo.create({
              productId: item.productId,
              type: "IN",
              source: "STOCKTAKE",
              reason: `Chênh lệch kiểm kê (phiên #${stocktake.id})`,
              quantity: item.difference,
              unitCost: null,
              batchId: batch.id,
              note: stocktake.note
                ? `Phiên kiểm kê #${stocktake.id}: ${stocktake.note}`
                : `Phiên kiểm kê #${stocktake.id}`,
              createdBy: user.id,
            });
            await txRepo.save(tx);
          }
        }

        stocktake.status = "closed";
        stocktake.closedAt = new Date();
        return stocktakeRepo.save(stocktake);
      },
    );

    const items = await this.itemRepository.find({ where: { stocktakeId } });
    for (const item of items) {
      await this.productsService.evictCacheForProduct(item.productId);
    }

    const dto = await this.findOne(savedStocktake.id, user);
    return {
      ...dto,
      skipped_items: skippedItems.length > 0 ? skippedItems : undefined,
    };
  }

  async findOne(id: number, user: AuthUser): Promise<StocktakeDto> {
    const stocktake = await this.stocktakeRepository.findOne({
      where: { id },
    });

    if (!stocktake) {
      throw new BusinessException(
        "STOCKTAKE_NOT_FOUND",
        404,
        "Không tìm thấy phiên kiểm kê.",
      );
    }

    if (!user.roles.includes("admin") && stocktake.branchId !== user.branchId) {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền xem thông tin phiên kiểm kê của chi nhánh khác.",
      );
    }

    const items = await this.itemRepository.find({
      where: { stocktakeId: id },
      order: { id: "ASC" },
    });

    return this.toDto(stocktake, items);
  }

  async findAll(
    query: QueryStocktakesDto,
    user: AuthUser,
  ): Promise<{ data: StocktakeDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.stocktakeRepository.createQueryBuilder("s");

    if (!user.roles.includes("admin")) {
      qb.andWhere("s.branch_id = :branchId", { branchId: user.branchId });
    } else if (query.branch_id) {
      qb.andWhere("s.branch_id = :branchId", { branchId: query.branch_id });
    }

    if (query.status) {
      qb.andWhere("s.status = :status", { status: query.status });
    }

    qb.orderBy("s.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => this.toDto(row)),
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  private toDto(s: Stocktake, items?: StocktakeItem[]): StocktakeDto {
    return {
      id: s.id,
      branch_id: s.branchId,
      created_by: s.createdBy,
      status: s.status,
      note: s.note,
      created_at: s.createdAt,
      closed_at: s.closedAt,
      items: items ? items.map((it) => this.toItemDto(it)) : undefined,
    };
  }

  private toItemDto(it: StocktakeItem): StocktakeItemDto {
    return {
      id: it.id,
      stocktake_id: it.stocktakeId,
      product_id: it.productId,
      system_quantity: it.systemQuantity,
      counted_quantity: it.countedQuantity,
      difference: it.difference,
    };
  }
}
