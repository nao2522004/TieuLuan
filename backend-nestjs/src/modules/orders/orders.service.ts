import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { Product } from "../products/entities/product.entity";
import { CreateOrderDto, CreateOrderItemDto } from "./dto/create-order.dto";
import { OrderDataDto } from "./dto/order-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { AuthUser } from "../../common/guards/jwt-auth.guard";
import { ShiftsService } from "../shifts/shifts.service";
import { ProductsService } from "../products/products.service";

interface LineItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly shiftsService: ShiftsService,
    private readonly productsService: ProductsService,
  ) {}

  async create(dto: CreateOrderDto, user: AuthUser): Promise<OrderDataDto> {
    this.assertNoDuplicateItems(dto.items);

    const openShift = await this.shiftsService.findOpenShiftForUser(user.id);
    if (!openShift) {
      throw new BusinessException(
        "SHIFT_REQUIRED",
        400,
        "Bạn cần mở ca làm việc trước khi tạo đơn hàng.",
      );
    }

    const sortedItems = [...dto.items].sort(
      (a, b) => a.product_id - b.product_id,
    );

    const { order, items } = await this.dataSource.transaction(
      async (manager) => {
        const productRepo = manager.getRepository(Product);
        const lineItems: LineItem[] = [];

        for (const item of sortedItems) {
          const product = await productRepo
            .createQueryBuilder("p")
            .setLock("pessimistic_write")
            .where("p.id = :id", { id: item.product_id })
            .andWhere("p.branch_id = :branchId", {
              branchId: openShift.branchId,
            })
            .andWhere("p.deleted_at IS NULL")
            .getOne();

          if (!product) {
            throw new BusinessException(
              "PRODUCT_NOT_FOUND",
              404,
              `Không tìm thấy sản phẩm id=${item.product_id} trong chi nhánh của ca đang mở.`,
            );
          }

          if (product.stockQuantity < item.quantity) {
            throw new BusinessException(
              "INVENTORY_INSUFFICIENT",
              409,
              `Sản phẩm "${product.name}" không đủ tồn kho (còn ${product.stockQuantity}, cần ${item.quantity}).`,
            );
          }

          product.stockQuantity -= item.quantity;
          await productRepo.save(product);

          lineItems.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: Number(product.salePrice),
          });
        }

        const subtotal = lineItems.reduce(
          (sum, li) => sum + li.unitPrice * li.quantity,
          0,
        );
        const discountAmount = dto.discount_amount ?? 0;
        const totalAmount = subtotal - discountAmount;

        if (totalAmount < 0) {
          throw new BusinessException(
            "ORDER_DISCOUNT_INVALID",
            400,
            "discount_amount không được lớn hơn tổng tiền hàng.",
          );
        }

        const orderRepo = manager.getRepository(Order);
        const orderEntity = orderRepo.create({
          branchId: openShift.branchId,
          shiftId: openShift.id,
          createdBy: user.id,
          status: "completed",
          paymentMethod: dto.payment_method,
          paymentStatus: "paid",
          discountAmount,
          totalAmount,
        });
        const savedOrder = await orderRepo.save(orderEntity);

        const itemRepo = manager.getRepository(OrderItem);
        const itemEntities = lineItems.map((li) =>
          itemRepo.create({
            orderId: savedOrder.id,
            productId: li.productId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          }),
        );
        const savedItems = await itemRepo.save(itemEntities);

        return { order: savedOrder, items: savedItems };
      },
    );

    for (const item of sortedItems) {
      try {
        await this.productsService.evictCacheForProduct(item.product_id);
      } catch {
        // đã có log/warn bên trong RedisService, ở đây chỉ đảm bảo không throw ra ngoài
      }
    }

    return this.toDto(order, items);
  }

  private assertNoDuplicateItems(items: CreateOrderItemDto[]): void {
    const seen = new Set<number>();
    for (const item of items) {
      if (seen.has(item.product_id)) {
        throw new BusinessException(
          "VALIDATION_ERROR",
          400,
          `items: product_id ${item.product_id} bị lặp lại, vui lòng gộp thành 1 dòng với tổng số lượng`,
        );
      }
      seen.add(item.product_id);
    }
  }

  private toDto(order: Order, items: OrderItem[]): OrderDataDto {
    return {
      id: order.id,
      branch_id: order.branchId,
      shift_id: order.shiftId,
      created_by: order.createdBy,
      status: order.status,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      discount_amount: Number(order.discountAmount),
      total_amount: Number(order.totalAmount),
      items: items.map((it) => ({
        id: it.id,
        product_id: it.productId,
        quantity: it.quantity,
        unit_price: Number(it.unitPrice),
      })),
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };
  }
}
