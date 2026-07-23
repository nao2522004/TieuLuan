import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { ProductBatch } from "./entities/product-batch.entity";
import { OrderItemBatch } from "../orders/entities/order-item-batch.entity";
import { BusinessException } from "../../common/exceptions/business.exception";

@Injectable()
export class BatchConsumptionService {
  constructor(
    @InjectRepository(ProductBatch)
    private readonly productBatchRepository: Repository<ProductBatch>,
  ) {}

  async consumeFefo(
    manager: EntityManager,
    productId: number,
    quantity: number,
  ): Promise<
    { batchId: number; quantityTaken: number; expiryDate: string | null }[]
  > {
    if (quantity <= 0) {
      return [];
    }

    const product = await manager
      .getRepository(Product)
      .createQueryBuilder("p")
      .setLock("pessimistic_write")
      .where("p.id = :productId AND p.deleted_at IS NULL", { productId })
      .getOne();

    if (!product) {
      throw new BusinessException(
        "PRODUCT_NOT_FOUND",
        404,
        `Không tìm thấy sản phẩm ID ${productId}.`,
      );
    }

    const batches = await manager
      .getRepository(ProductBatch)
      .createQueryBuilder("pb")
      .setLock("pessimistic_write")
      .where(
        "pb.product_id = :productId AND pb.deleted_at IS NULL AND pb.quantity_remaining > 0",
        {
          productId,
        },
      )
      .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
      .addOrderBy("pb.id", "ASC")
      .getMany();

    const totalRemaining = batches.reduce(
      (sum, b) => sum + b.quantityRemaining,
      0,
    );
    if (totalRemaining < quantity) {
      throw new BusinessException(
        "INVENTORY_INSUFFICIENT",
        409,
        `Sản phẩm "${product.name}" không đủ tồn kho (còn ${totalRemaining}, cần ${quantity}).`,
      );
    }

    let quantityToConsume = quantity;
    const consumed: {
      batchId: number;
      quantityTaken: number;
      expiryDate: string | null;
    }[] = [];

    for (const batch of batches) {
      if (quantityToConsume <= 0) break;

      const take = Math.min(batch.quantityRemaining, quantityToConsume);
      batch.quantityRemaining -= take;
      quantityToConsume -= take;

      consumed.push({
        batchId: batch.id,
        quantityTaken: take,
        expiryDate: batch.expiryDate,
      });
      await manager.getRepository(ProductBatch).save(batch);
    }

    product.stockQuantity -= quantity;

    const earliestBatch = await manager
      .getRepository(ProductBatch)
      .createQueryBuilder("pb")
      .where(
        "pb.product_id = :productId AND pb.deleted_at IS NULL AND pb.quantity_remaining > 0",
        {
          productId,
        },
      )
      .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
      .addOrderBy("pb.id", "ASC")
      .getOne();

    product.nearestExpiryDate = earliestBatch ? earliestBatch.expiryDate : null;
    await manager.getRepository(Product).save(product);

    return consumed;
  }

  async consumeSpecificBatch(
    manager: EntityManager,
    productId: number,
    batchId: number,
    quantity: number,
  ): Promise<
    { batchId: number; quantityTaken: number; expiryDate: string | null }[]
  > {
    if (quantity <= 0) {
      return [];
    }

    const product = await manager
      .getRepository(Product)
      .createQueryBuilder("p")
      .setLock("pessimistic_write")
      .where("p.id = :productId AND p.deleted_at IS NULL", { productId })
      .getOne();

    if (!product) {
      throw new BusinessException(
        "PRODUCT_NOT_FOUND",
        404,
        `Không tìm thấy sản phẩm ID ${productId}.`,
      );
    }

    const batch = await manager
      .getRepository(ProductBatch)
      .createQueryBuilder("pb")
      .setLock("pessimistic_write")
      .where(
        "pb.id = :batchId AND pb.product_id = :productId AND pb.deleted_at IS NULL",
        { batchId, productId },
      )
      .getOne();

    if (!batch) {
      throw new BusinessException(
        "BATCH_NOT_FOUND",
        404,
        `Không tìm thấy lô hàng ID ${batchId} của sản phẩm này.`,
      );
    }

    if (batch.quantityRemaining < quantity) {
      throw new BusinessException(
        "INVENTORY_INSUFFICIENT",
        409,
        `Lô hàng "${batch.batchCode}" chỉ còn tồn ${batch.quantityRemaining} (cần trừ ${quantity}).`,
      );
    }

    batch.quantityRemaining -= quantity;
    await manager.getRepository(ProductBatch).save(batch);

    product.stockQuantity -= quantity;

    const earliestBatch = await manager
      .getRepository(ProductBatch)
      .createQueryBuilder("pb")
      .where(
        "pb.product_id = :productId AND pb.deleted_at IS NULL AND pb.quantity_remaining > 0",
        { productId },
      )
      .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
      .addOrderBy("pb.id", "ASC")
      .getOne();

    product.nearestExpiryDate = earliestBatch ? earliestBatch.expiryDate : null;
    await manager.getRepository(Product).save(product);

    return [
      {
        batchId: batch.id,
        quantityTaken: quantity,
        expiryDate: batch.expiryDate,
      },
    ];
  }

  async receiveBatch(
    manager: EntityManager,
    productId: number,
    quantity: number,
    expiryDate: string | null,
    unitCost: number,
    createdBy: number,
    batchCode?: string,
  ): Promise<ProductBatch> {
    const product = await manager
      .getRepository(Product)
      .createQueryBuilder("p")
      .setLock("pessimistic_write")
      .where("p.id = :productId AND p.deleted_at IS NULL", { productId })
      .getOne();

    if (!product) {
      throw new BusinessException(
        "PRODUCT_NOT_FOUND",
        404,
        `Không tìm thấy sản phẩm ID ${productId}.`,
      );
    }

    const batchRepo = manager.getRepository(ProductBatch);
    const code = batchCode && batchCode.trim() ? batchCode.trim() : null;

    const newBatch = batchRepo.create({
      productId,
      batchCode: code || "TEMP",
      quantityReceived: quantity,
      quantityRemaining: quantity,
      unitCost,
      expiryDate: expiryDate || null,
      createdBy,
    });

    const savedBatch = await batchRepo.save(newBatch);

    if (!code) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      savedBatch.batchCode = `LÔ-${yyyy}${mm}${dd}-${savedBatch.id}`;
      await batchRepo.save(savedBatch);
    }

    product.stockQuantity += quantity;

    const earliestBatch = await manager
      .getRepository(ProductBatch)
      .createQueryBuilder("pb")
      .where(
        "pb.product_id = :productId AND pb.deleted_at IS NULL AND pb.quantity_remaining > 0",
        {
          productId,
        },
      )
      .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
      .addOrderBy("pb.id", "ASC")
      .getOne();

    product.nearestExpiryDate = earliestBatch ? earliestBatch.expiryDate : null;
    await manager.getRepository(Product).save(product);

    return savedBatch;
  }

  async restoreExactBatches(
    manager: EntityManager,
    orderItemId: number,
    productId: number,
  ): Promise<void> {
    const itemBatches = await manager.getRepository(OrderItemBatch).find({
      where: { orderItemId },
      order: { batchId: "ASC" },
    });

    if (itemBatches.length === 0) return;

    const product = await manager
      .getRepository(Product)
      .createQueryBuilder("p")
      .setLock("pessimistic_write")
      .where("p.id = :productId AND p.deleted_at IS NULL", { productId })
      .getOne();

    const batchRepo = manager.getRepository(ProductBatch);
    let totalRestored = 0;

    for (const ib of itemBatches) {
      const batch = await batchRepo
        .createQueryBuilder("pb")
        .setLock("pessimistic_write")
        .where("pb.id = :batchId", { batchId: ib.batchId })
        .getOne();

      if (batch) {
        batch.quantityRemaining += ib.quantityTaken;
        await batchRepo.save(batch);
        totalRestored += ib.quantityTaken;
      }
    }

    if (product && totalRestored > 0) {
      product.stockQuantity += totalRestored;

      const earliestBatch = await manager
        .getRepository(ProductBatch)
        .createQueryBuilder("pb")
        .where(
          "pb.product_id = :productId AND pb.deleted_at IS NULL AND pb.quantity_remaining > 0",
          { productId },
        )
        .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
        .addOrderBy("pb.id", "ASC")
        .getOne();

      product.nearestExpiryDate = earliestBatch
        ? earliestBatch.expiryDate
        : null;
      await manager.getRepository(Product).save(product);
    }
  }

  async simulateFefo(
    productId: number,
    quantity: number,
  ): Promise<{ expiryDate: string | null; quantityTaken: number }[]> {
    if (quantity <= 0) return [];

    const batches = await this.productBatchRepository
      .createQueryBuilder("pb")
      .where(
        "pb.product_id = :productId AND pb.deleted_at IS NULL AND pb.quantity_remaining > 0",
        { productId },
      )
      .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
      .addOrderBy("pb.id", "ASC")
      .getMany();

    let remaining = quantity;
    const result: { expiryDate: string | null; quantityTaken: number }[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantityRemaining, remaining);
      result.push({ expiryDate: batch.expiryDate, quantityTaken: take });
      remaining -= take;
    }

    if (remaining > 0) {
      result.push({ expiryDate: null, quantityTaken: remaining });
    }

    return result;
  }

  async restoreQuantityForReturnedItem(
    manager: EntityManager,
    orderItemId: number,
    productId: number,
    quantityToRestore: number,
  ): Promise<void> {
    if (quantityToRestore <= 0) return;

    const product = await manager
      .getRepository(Product)
      .createQueryBuilder("p")
      .setLock("pessimistic_write")
      .where("p.id = :productId AND p.deleted_at IS NULL", { productId })
      .getOne();

    if (!product) return;

    const batchRepo = manager.getRepository(ProductBatch);
    const itemBatches = await manager.getRepository(OrderItemBatch).find({
      where: { orderItemId },
      order: { id: "DESC" },
    });

    let remainingToRestore = quantityToRestore;

    for (const ib of itemBatches) {
      if (remainingToRestore <= 0) break;

      const batch = await batchRepo
        .createQueryBuilder("pb")
        .setLock("pessimistic_write")
        .where("pb.id = :batchId", { batchId: ib.batchId })
        .getOne();

      if (batch) {
        batch.quantityRemaining += remainingToRestore;
        await batchRepo.save(batch);
        remainingToRestore = 0;
      }
    }

    if (remainingToRestore > 0) {
      const fallbackBatch = await batchRepo
        .createQueryBuilder("pb")
        .setLock("pessimistic_write")
        .where("pb.product_id = :productId AND pb.deleted_at IS NULL", {
          productId,
        })
        .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
        .addOrderBy("pb.id", "DESC")
        .getOne();

      if (fallbackBatch) {
        fallbackBatch.quantityRemaining += remainingToRestore;
        await batchRepo.save(fallbackBatch);
      }
    }

    product.stockQuantity += quantityToRestore;

    const earliestBatch = await manager
      .getRepository(ProductBatch)
      .createQueryBuilder("pb")
      .where(
        "pb.product_id = :productId AND pb.deleted_at IS NULL AND pb.quantity_remaining > 0",
        { productId },
      )
      .orderBy("pb.expiry_date", "ASC", "NULLS LAST")
      .addOrderBy("pb.id", "ASC")
      .getOne();

    product.nearestExpiryDate = earliestBatch ? earliestBatch.expiryDate : null;
    await manager.getRepository(Product).save(product);
  }
}
