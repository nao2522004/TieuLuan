import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { InventoryTransaction } from "./entities/inventory-transaction.entity";
import { Product } from "../products/entities/product.entity";
import { CreateInventoryTransactionDto } from "./dto/create-inventory-transaction.dto";
import { InventoryTransactionDto } from "./dto/inventory-transaction-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ProductsService } from "../products/products.service";

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
    userId: number,
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

      product.stockQuantity += dto.quantity;
      await productRepo.save(product);

      const entity = manager.getRepository(InventoryTransaction).create({
        productId: dto.product_id,
        type: "IN",
        quantity: dto.quantity,
        unitCost: dto.unit_cost ?? null,
        note: dto.note ?? null,
        createdBy: userId,
      });

      return manager.getRepository(InventoryTransaction).save(entity);
    });

    await this.productsService.evictCacheForProduct(dto.product_id);

    return this.toDto(saved);
  }

  private toDto(tx: InventoryTransaction): InventoryTransactionDto {
    return {
      id: tx.id,
      product_id: tx.productId,
      type: tx.type,
      quantity: tx.quantity,
      unit_cost: tx.unitCost,
      note: tx.note,
      created_by: tx.createdBy,
      created_at: tx.createdAt,
    };
  }
}
