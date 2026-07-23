import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, IsNull, In } from "typeorm";
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
import { ProductBatch } from "../products/entities/product-batch.entity";
import { BranchesService } from "../branches/branches.service";
import { UsersService } from "../users/users.service";

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
    private readonly branchesService: BranchesService,
    private readonly usersService: UsersService,
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

      const difference = dto.counted_quantity - product.stockQuantity;

      const rows = await manager.query<RawUpsertRow[]>(
        `
        INSERT INTO stocktake_items
          (stocktake_id, product_id, system_quantity, counted_quantity, difference)
        VALUES ($1, $2, $3, $4, $5)
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
          difference,
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

  async recordItemsBulk(
    stocktakeId: number,
    dtos: CreateStocktakeItemDto[],
    user: AuthUser,
  ): Promise<StocktakeItemDto[]> {
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

      const results: StocktakeItemDto[] = [];

      for (const dto of dtos) {
        const product = await manager.getRepository(Product).findOne({
          where: { id: dto.product_id, deletedAt: IsNull() },
        });

        if (!product || product.branchId !== stocktake.branchId) {
          continue;
        }

        const difference = dto.counted_quantity - product.stockQuantity;

        const rows = await manager.query<RawUpsertRow[]>(
          `
          INSERT INTO stocktake_items
            (stocktake_id, product_id, system_quantity, counted_quantity, difference)
          VALUES ($1, $2, $3, $4, $5)
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
            difference,
          ],
        );

        const row = rows[0];
        results.push({
          id: parseInt(row.id, 10),
          stocktake_id: parseInt(row.stocktake_id, 10),
          product_id: parseInt(row.product_id, 10),
          system_quantity: row.system_quantity,
          counted_quantity: row.counted_quantity,
          difference: row.difference,
        });
      }

      return results;
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

    const productIds = items.map((i) => i.productId);
    const productMap = new Map<number, Product>();
    const itemBatchesMap = new Map<
      number,
      {
        batch_id: number;
        batch_code: string;
        expiry_date: string | null;
        quantity_remaining: number;
      }[]
    >();

    if (productIds.length > 0) {
      const products = await this.productRepository.find({
        where: { id: In(productIds) },
      });
      for (const p of products) {
        productMap.set(p.id, p);
      }

      const batchRows = await this.dataSource
        .getRepository(ProductBatch)
        .createQueryBuilder("pb")
        .select([
          "pb.product_id AS product_id",
          "pb.id AS batch_id",
          "pb.batch_code AS batch_code",
          "pb.expiry_date AS expiry_date",
          "pb.quantity_remaining AS quantity_remaining",
        ])
        .where("pb.product_id IN (:...productIds)", { productIds })
        .andWhere("pb.quantity_remaining > 0")
        .getRawMany<{
          product_id: string;
          batch_id: string;
          batch_code: string;
          expiry_date: Date | null;
          quantity_remaining: number;
        }>();

      for (const row of batchRows) {
        const productId = Number(row.product_id);
        const list = itemBatchesMap.get(productId) ?? [];
        list.push({
          batch_id: Number(row.batch_id),
          batch_code: row.batch_code,
          expiry_date: row.expiry_date
            ? new Date(row.expiry_date).toISOString().split("T")[0]
            : null,
          quantity_remaining: row.quantity_remaining,
        });
        itemBatchesMap.set(productId, list);
      }
    }

    const itemAdjustmentsMap = new Map<
      number,
      {
        batch_code: string;
        expiry_date: string | null;
        type: "IN" | "OUT";
        quantity: number;
      }[]
    >();

    if (stocktake.status === "closed") {
      const txRows = await this.dataSource
        .getRepository(InventoryTransaction)
        .createQueryBuilder("tx")
        .leftJoin(ProductBatch, "pb", "pb.id = tx.batch_id")
        .select([
          "tx.product_id AS product_id",
          "tx.type AS type",
          "tx.quantity AS quantity",
          "pb.batch_code AS batch_code",
          "pb.expiry_date AS expiry_date",
        ])
        .where("tx.source = :source", { source: "STOCKTAKE" })
        .andWhere("tx.reason LIKE :reason", { reason: `%phiên #${id}%` })
        .getRawMany<{
          product_id: string;
          type: "IN" | "OUT";
          quantity: number;
          batch_code: string | null;
          expiry_date: Date | null;
        }>();

      for (const row of txRows) {
        const productId = Number(row.product_id);
        const list = itemAdjustmentsMap.get(productId) ?? [];
        list.push({
          batch_code: row.batch_code ?? `LÔ-KIỂMKÊ-${id}-${productId}`,
          expiry_date: row.expiry_date
            ? new Date(row.expiry_date).toISOString().split("T")[0]
            : null,
          type: row.type,
          quantity: Number(row.quantity),
        });
        itemAdjustmentsMap.set(productId, list);
      }
    }

    const branchNames = await this.branchesService.findNamesByIds([
      stocktake.branchId,
    ]);
    const userNames = await this.usersService.findNamesByIds([
      stocktake.createdBy,
    ]);

    return this.toDto(
      stocktake,
      items,
      productMap,
      itemBatchesMap,
      itemAdjustmentsMap,
      branchNames.get(stocktake.branchId),
      userNames.get(stocktake.createdBy),
    );
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

    const branchIds = [...new Set(rows.map((r) => r.branchId))];
    const userIds = [...new Set(rows.map((r) => r.createdBy))];

    const branchNames = await this.branchesService.findNamesByIds(branchIds);
    const userNames = await this.usersService.findNamesByIds(userIds);

    return {
      data: rows.map((row) =>
        this.toDto(
          row,
          undefined,
          undefined,
          undefined,
          undefined,
          branchNames.get(row.branchId),
          userNames.get(row.createdBy),
        ),
      ),
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  private toDto(
    s: Stocktake,
    items?: StocktakeItem[],
    productMap?: Map<number, Product>,
    itemBatchesMap?: Map<
      number,
      {
        batch_id: number;
        batch_code: string;
        expiry_date: string | null;
        quantity_remaining: number;
      }[]
    >,
    itemAdjustmentsMap?: Map<
      number,
      {
        batch_code: string;
        expiry_date: string | null;
        type: "IN" | "OUT";
        quantity: number;
      }[]
    >,
    branchName?: string,
    creatorName?: string,
  ): StocktakeDto {
    return {
      id: s.id,
      branch_id: s.branchId,
      branch_name: branchName ?? null,
      created_by: s.createdBy,
      creator_name: creatorName ?? null,
      status: s.status,
      note: s.note,
      created_at: s.createdAt,
      closed_at: s.closedAt,
      items: items
        ? items.map((it) =>
            this.toItemDto(
              it,
              productMap?.get(it.productId),
              itemBatchesMap?.get(it.productId),
              itemAdjustmentsMap?.get(it.productId),
            ),
          )
        : undefined,
    };
  }

  private toItemDto(
    it: StocktakeItem,
    product?: Product,
    batches?: {
      batch_id: number;
      batch_code: string;
      expiry_date: string | null;
      quantity_remaining: number;
    }[],
    adjustments?: {
      batch_code: string;
      expiry_date: string | null;
      type: "IN" | "OUT";
      quantity: number;
    }[],
  ): StocktakeItemDto {
    return {
      id: it.id,
      stocktake_id: it.stocktakeId,
      product_id: it.productId,
      product_name: product?.name ?? null,
      product_barcode: product?.barcode ?? null,
      unit: product?.unit ?? null,
      system_quantity: it.systemQuantity,
      counted_quantity: it.countedQuantity,
      difference: it.difference,
      batches: batches ?? [],
      batch_adjustments: adjustments ?? [],
    };
  }
}
