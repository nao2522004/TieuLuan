import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Request } from "express";
import { Order } from "../../modules/orders/entities/order.entity";
import { BusinessException } from "../exceptions/business.exception";

@Injectable()
export class OrderBranchAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user!;
    const rawId = request.params.id;
    const id = Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new BusinessException(
        "VALIDATION_ERROR",
        400,
        "id: phải là số nguyên dương",
      );
    }

    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new BusinessException(
        "ORDER_NOT_FOUND",
        404,
        "Không tìm thấy đơn hàng.",
      );
    }

    if (user.role !== "admin" && user.branchId !== order.branchId) {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền thao tác với đơn hàng của chi nhánh khác.",
      );
    }

    return true;
  }
}
