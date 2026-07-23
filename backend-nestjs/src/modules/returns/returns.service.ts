import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Return } from "./entities/return.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { Order } from "../orders/entities/order.entity";
import { CreateReturnDto } from "./dto/create-return.dto";
import { QueryReturnsDto } from "./dto/query-returns.dto";
import { ReturnDto } from "./dto/return-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { AuthUser } from "../../common/guards/jwt-auth.guard";
import { PaginationMeta } from "../../common/dto/api-response.dto";

import { BatchConsumptionService } from "../products/batch-consumption.service";
import { ProductsService } from "../products/products.service";

@Injectable()
export class ReturnsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly batchConsumptionService: BatchConsumptionService,
    private readonly productsService: ProductsService,
  ) {}

  async create(dto: CreateReturnDto, user: AuthUser): Promise<ReturnDto> {
    let returnedProductId: number | null = null;

    const saved = await this.dataSource.transaction(async (manager) => {
      const orderItemRepo = manager.getRepository(OrderItem);
      const orderRepo = manager.getRepository(Order);
      const returnRepo = manager.getRepository(Return);

      const orderItem = await orderItemRepo
        .createQueryBuilder("oi")
        .setLock("pessimistic_write")
        .where("oi.id = :id", { id: dto.order_item_id })
        .getOne();

      if (!orderItem) {
        throw new BusinessException(
          "ORDER_ITEM_NOT_FOUND",
          404,
          "Không tìm thấy dòng sản phẩm trong đơn hàng.",
        );
      }

      returnedProductId = orderItem.productId;

      const order = await orderRepo.findOne({
        where: { id: orderItem.orderId },
      });
      if (!order) {
        throw new BusinessException(
          "ORDER_NOT_FOUND",
          404,
          "Không tìm thấy đơn hàng chứa dòng sản phẩm này.",
        );
      }

      if (order.status === "cancelled") {
        throw new BusinessException(
          "ORDER_ALREADY_CANCELLED",
          400,
          "Đơn hàng này đã bị hủy, không thể thực hiện trả hàng.",
        );
      }

      if (!user.roles.includes("admin") && user.branchId !== order.branchId) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền xử lý trả hàng cho đơn hàng của chi nhánh khác.",
        );
      }

      const alreadyReturnedRow = await returnRepo
        .createQueryBuilder("r")
        .select("COALESCE(SUM(r.quantity), 0)", "sum")
        .where("r.order_item_id = :id", { id: dto.order_item_id })
        .getRawOne<{ sum: string }>();
      const alreadyReturned = Number(alreadyReturnedRow?.sum ?? 0);

      const remaining = orderItem.quantity - alreadyReturned;

      if (remaining <= 0) {
        throw new BusinessException(
          "RETURN_QUANTITY_EXCEEDS",
          400,
          `Sản phẩm "${orderItem.productName ?? `ID #${orderItem.productId}`}" trong đơn hàng đã được trả đủ (${alreadyReturned}/${orderItem.quantity} sản phẩm), không thể trả thêm.`,
        );
      }

      if (dto.quantity > remaining) {
        throw new BusinessException(
          "RETURN_QUANTITY_EXCEEDS",
          400,
          `Số lượng xin trả (${dto.quantity}) vượt quá số lượng còn lại có thể trả (${remaining} sản phẩm).`,
        );
      }

      const refundAmount = Number(orderItem.unitPrice) * dto.quantity;

      const entity = returnRepo.create({
        orderItemId: dto.order_item_id,
        quantity: dto.quantity,
        refundAmount,
        reason: dto.reason ?? null,
        createdBy: user.id,
      });

      const savedReturn = await returnRepo.save(entity);

      // Cộng lại tồn kho sản phẩm & lô hàng tương ứng
      await this.batchConsumptionService.restoreQuantityForReturnedItem(
        manager,
        dto.order_item_id,
        orderItem.productId,
        dto.quantity,
      );

      return savedReturn;
    });

    if (returnedProductId) {
      try {
        await this.productsService.evictCacheForProduct(returnedProductId);
      } catch {}
    }

    return this.toDto(saved);
  }

  async findAllPaginated(
    query: QueryReturnsDto,
    user: AuthUser,
  ): Promise<{ data: ReturnDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.dataSource
      .getRepository(Return)
      .createQueryBuilder("r")
      .innerJoin(OrderItem, "oi", "r.order_item_id = oi.id")
      .innerJoin(Order, "o", "oi.order_id = o.id");

    if (!user.roles.includes("admin")) {
      qb.andWhere("o.branch_id = :branchId", { branchId: user.branchId });
    }

    if (query.order_id !== undefined) {
      qb.andWhere("o.id = :orderId", { orderId: query.order_id });
    }

    if (query.created_by !== undefined) {
      qb.andWhere("r.created_by = :createdBy", { createdBy: query.created_by });
    }

    qb.orderBy("r.id", "DESC")
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

  async findOneOrThrow(id: number, user: AuthUser): Promise<ReturnDto> {
    const returnRecord = await this.dataSource.getRepository(Return).findOne({
      where: { id },
    });
    if (!returnRecord) {
      throw new BusinessException(
        "RETURN_NOT_FOUND",
        404,
        "Không tìm thấy giao dịch trả hàng.",
      );
    }

    const orderItem = await this.dataSource.getRepository(OrderItem).findOne({
      where: { id: returnRecord.orderItemId },
    });
    if (!orderItem) {
      throw new BusinessException(
        "ORDER_ITEM_NOT_FOUND",
        404,
        "Không tìm thấy dòng sản phẩm trong đơn hàng tương ứng.",
      );
    }

    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderItem.orderId },
    });
    if (!order) {
      throw new BusinessException(
        "ORDER_NOT_FOUND",
        404,
        "Không tìm thấy đơn hàng tương ứng.",
      );
    }

    // Kiểm tra quyền chi nhánh
    if (!user.roles.includes("admin") && order.branchId !== user.branchId) {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền truy cập giao dịch trả hàng của chi nhánh khác.",
      );
    }

    return this.toDto(returnRecord);
  }

  private toDto(ret: Return): ReturnDto {
    return {
      id: ret.id,
      order_item_id: ret.orderItemId,
      quantity: ret.quantity,
      refund_amount: Number(ret.refundAmount),
      reason: ret.reason,
      created_by: ret.createdBy,
      created_by_name: ret.creator?.fullName ?? null,
      created_at: ret.createdAt,
      zalopay_m_refund_id: ret.zalopayMRefundId ?? null,
      zalopay_refund_id: ret.zalopayRefundId ?? null,
      zalopay_refund_status: ret.zalopayRefundStatus ?? null,
    };
  }
}
