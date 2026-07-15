import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Return } from "./entities/return.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { Order } from "../orders/entities/order.entity";
import { CreateReturnDto } from "./dto/create-return.dto";
import { ReturnDto } from "./dto/return-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { AuthUser } from "../../common/guards/jwt-auth.guard";

@Injectable()
export class ReturnsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateReturnDto, user: AuthUser): Promise<ReturnDto> {
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

      if (user.role !== "admin" && user.branchId !== order.branchId) {
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
      if (dto.quantity > remaining) {
        throw new BusinessException(
          "RETURN_QUANTITY_EXCEEDS",
          400,
          `Số lượng trả (${dto.quantity}) vượt quá số lượng còn có thể trả (${remaining}).`,
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

      return returnRepo.save(entity);
    });

    return this.toDto(saved);
  }

  private toDto(ret: Return): ReturnDto {
    return {
      id: ret.id,
      order_item_id: ret.orderItemId,
      quantity: ret.quantity,
      refund_amount: Number(ret.refundAmount),
      reason: ret.reason,
      created_by: ret.createdBy,
      created_at: ret.createdAt,
      zalopay_m_refund_id: ret.zalopayMRefundId ?? null,
      zalopay_refund_id: ret.zalopayRefundId ?? null,
      zalopay_refund_status: ret.zalopayRefundStatus ?? null,
    };
  }
}
