import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { InventoryTransaction } from "./entities/inventory-transaction.entity";
import { Product } from "../products/entities/product.entity";
import { CreateInventoryTransactionDto } from "./dto/create-inventory-transaction.dto";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { QueryInventoryTransactionsDto } from "./dto/query-inventory-transactions.dto";
import { InventoryTransactionDto } from "./dto/inventory-transaction-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ProductsService } from "../products/products.service";
import { AuthUser } from "../../common/guards/jwt-auth.guard";
import { PaginationMeta } from "../../common/dto/api-response.dto";

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryTransaction)
    private readonly inventoryRepository: Repository<InventoryTransaction>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
  ) {}

  async createInboundTransaction(
    dto: CreateInventoryTransactionDto,
    user: AuthUser,
  ): Promise<InventoryTransactionDto> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);

      const product = await productRepo
        .createQueryBuilder("p")
        .setLock("pessimistic_write")
        .where("p.id = :id", { id: dto.product_id })
        .andWhere("p.deleted_at IS NULL")
        .getOne();

      if (!product) {
        throw new BusinessException(
          "PRODUCT_NOT_FOUND",
          404,
          "Không tìm thấy sản phẩm.",
        );
      }

      if (!user.roles.includes("admin") && product.branchId !== user.branchId) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền nhập kho cho sản phẩm thuộc chi nhánh khác.",
        );
      }

      product.stockQuantity += dto.quantity;
      await productRepo.save(product);

      const entity = manager.getRepository(InventoryTransaction).create({
        productId: dto.product_id,
        type: "IN",
        source: "INBOUND",
        reason: null,
        quantity: dto.quantity,
        unitCost: dto.unit_cost ?? null,
        note: dto.note ?? null,
        createdBy: user.id,
      });

      return manager.getRepository(InventoryTransaction).save(entity);
    });

    await this.productsService.evictCacheForProduct(dto.product_id);

    return this.toDto(saved);
  }

  async createAdjustment(
    dto: CreateAdjustmentDto,
    user: AuthUser,
  ): Promise<InventoryTransactionDto> {
    const saved = await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);

      const product = await productRepo
        .createQueryBuilder("p")
        .setLock("pessimistic_write")
        .where("p.id = :id", { id: dto.product_id })
        .andWhere("p.deleted_at IS NULL")
        .getOne();

      if (!product) {
        throw new BusinessException(
          "PRODUCT_NOT_FOUND",
          404,
          "Không tìm thấy sản phẩm.",
        );
      }

      // Kiểm tra chi nhánh
      if (!user.roles.includes("admin") && product.branchId !== user.branchId) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền điều chỉnh sản phẩm thuộc chi nhánh khác.",
        );
      }

      // Kiểm tra chặn tồn kho âm ở tầng Service
      if (product.stockQuantity < dto.quantity) {
        throw new BusinessException(
          "INVENTORY_INSUFFICIENT",
          400,
          "Không đủ tồn kho để thực hiện thao tác.",
        );
      }

      product.stockQuantity -= dto.quantity;
      await productRepo.save(product);

      const entity = manager.getRepository(InventoryTransaction).create({
        productId: dto.product_id,
        type: "OUT",
        source: "ADJUSTMENT",
        reason: dto.reason,
        quantity: dto.quantity,
        unitCost: null,
        note: dto.note ?? null,
        createdBy: user.id,
      });

      return manager.getRepository(InventoryTransaction).save(entity);
    });

    await this.productsService.evictCacheForProduct(dto.product_id);

    return this.toDto(saved);
  }

  async findAllPaginated(
    query: QueryInventoryTransactionsDto,
    user: AuthUser,
  ): Promise<{ data: InventoryTransactionDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.inventoryRepository
      .createQueryBuilder("tx")
      .innerJoin(Product, "p", "tx.product_id = p.id")
      .where("p.deleted_at IS NULL");

    // Lọc theo chi nhánh nếu không phải admin
    if (!user.roles.includes("admin")) {
      qb.andWhere("p.branch_id = :branchId", { branchId: user.branchId });
    }

    if (query.product_id !== undefined) {
      qb.andWhere("tx.product_id = :productId", {
        productId: query.product_id,
      });
    }
    if (query.type) {
      qb.andWhere("tx.type = :type", { type: query.type });
    }
    if (query.source) {
      qb.andWhere("tx.source = :source", { source: query.source });
    }

    qb.orderBy("tx.id", "DESC")
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

  private toDto(tx: InventoryTransaction): InventoryTransactionDto {
    return {
      id: tx.id,
      product_id: tx.productId,
      type: tx.type,
      source: tx.source,
      reason: tx.reason,
      quantity: tx.quantity,
      unit_cost: tx.unitCost != null ? Number(tx.unitCost) : null,
      note: tx.note,
      created_by: tx.createdBy,
      created_at: tx.createdAt,
    };
  }
}
