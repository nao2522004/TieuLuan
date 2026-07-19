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
    const stocktake = await this.stocktakeRepository.findOne({
      where: { id: stocktakeId },
    });

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

    if (!user.roles.includes("admin") && stocktake.branchId !== user.branchId) {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền thao tác trên phiên kiểm kê của chi nhánh khác.",
      );
    }

    const product = await this.productRepository.findOne({
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

    let item = await this.itemRepository.findOne({
      where: { stocktakeId, productId: dto.product_id },
    });

    if (item) {
      item.countedQuantity = dto.counted_quantity;
      item.difference = item.countedQuantity - item.systemQuantity;
    } else {
      item = this.itemRepository.create({
        stocktakeId,
        productId: dto.product_id,
        systemQuantity: product.stockQuantity,
        countedQuantity: dto.counted_quantity,
        difference: dto.counted_quantity - product.stockQuantity,
      });
    }

    const saved = await this.itemRepository.save(item);
    return this.toItemDto(saved);
  }

  async close(stocktakeId: number, user: AuthUser): Promise<StocktakeDto> {
    const savedStocktake = await this.dataSource.transaction(async (manager) => {
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

      if (!user.roles.includes("admin") && stocktake.branchId !== user.branchId) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền chốt phiên kiểm kê của chi nhánh khác.",
        );
      }

      const items = await itemRepo.find({
        where: { stocktakeId },
      });

      for (const item of items) {
        const product = await productRepo
          .createQueryBuilder("p")
          .setLock("pessimistic_write")
          .where("p.id = :id", { id: item.productId })
          .andWhere("p.deleted_at IS NULL")
          .getOne();

        if (!product) {
          throw new BusinessException(
            "PRODUCT_NOT_FOUND",
            400,
            `Sản phẩm ID ${item.productId} không tồn tại hoặc đã bị xóa.`,
          );
        }

        product.stockQuantity = item.countedQuantity;
        await productRepo.save(product);

        if (item.difference !== 0) {
          const tx = txRepo.create({
            productId: item.productId,
            type: item.difference > 0 ? "IN" : "OUT",
            source: "STOCKTAKE",
            reason: `Chênh lệch kiểm kê (phiên #${stocktake.id})`,
            quantity: Math.abs(item.difference),
            unitCost: null,
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
    });

    const items = await this.itemRepository.find({ where: { stocktakeId } });
    for (const item of items) {
      await this.productsService.evictCacheForProduct(item.productId);
    }

    return this.findOne(savedStocktake.id, user);
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
