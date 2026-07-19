import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Repository } from "typeorm";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { Product } from "../products/entities/product.entity";
import { CreateOrderDto, CreateOrderItemDto } from "./dto/create-order.dto";
import { QueryOrderDto } from "./dto/query-order.dto";
import { OrderDataDto } from "./dto/order-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";
import { AuthUser } from "../../common/guards/jwt-auth.guard";
import { ShiftsService } from "../shifts/shifts.service";
import { ProductsService } from "../products/products.service";
import { BranchesService } from "../branches/branches.service";
import { ZaloPayService } from "../zalopay/zalopay.service";
import * as QRCode from "qrcode";
import { Logger } from "@nestjs/common";
import { PromotionsService } from "../promotions/promotions.service";
import { ExpiryPricingService } from "../expiry-pricing/expiry-pricing.service";

interface LineItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface QrResult {
  content: string;
  image: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly shiftsService: ShiftsService,
    private readonly productsService: ProductsService,
    private readonly branchesService: BranchesService,
    private readonly zaloPayService: ZaloPayService,
    private readonly promotionsService: PromotionsService,
    private readonly expiryPricingService: ExpiryPricingService,
  ) {}

  async create(dto: CreateOrderDto, user: AuthUser): Promise<OrderDataDto> {
    this.assertNoDuplicateItems(dto.items);

    if (!user.branchId) {
      throw new BusinessException(
        "SHIFT_BRANCH_REQUIRED",
        400,
        "Tài khoản của bạn không thuộc bất kỳ chi nhánh nào.",
      );
    }

    const openShift = await this.shiftsService.findOpenShiftForBranch(
      user.branchId,
    );
    if (!openShift) {
      throw new BusinessException(
        "SHIFT_REQUIRED",
        400,
        "Chi nhánh hiện chưa có ca làm việc nào đang mở.",
      );
    }

    const isAssigned =
      user.roles.includes("admin") ||
      openShift.userId === user.id ||
      (await this.shiftsService.isUserInShift(user.id, openShift.id));

    if (!isAssigned) {
      throw new BusinessException(
        "SHIFT_USER_NOT_ASSIGNED",
        403,
        "Bạn không được phân công làm việc trong ca đang mở của chi nhánh.",
      );
    }

    const isTransfer = dto.payment_method === "transfer";
    const paymentStatus = isTransfer ? "pending" : "paid";

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

          const pricing = await this.expiryPricingService.computeEffectivePrice(
            Number(product.salePrice),
            product.expiryDate,
          );

          lineItems.push({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: pricing.effective_price,
          });
        }

        const subtotal = lineItems.reduce(
          (s, li) => s + li.unitPrice * li.quantity,
          0,
        );

        if (dto.promotion_code && dto.discount_amount) {
          throw new BusinessException(
            "ORDER_DISCOUNT_PROMOTION_CONFLICT",
            400,
            "Không được truyền đồng thời discount_amount và promotion_code.",
          );
        }

        let discountAmount = dto.discount_amount ?? 0;
        let appliedPromotionCode: string | null = null;
        let appliedPromotionType: "percent" | "fixed" | null = null;
        let appliedPromotionValue: number | null = null;

        if (dto.promotion_code) {
          const result =
            await this.promotionsService.validateAndCalculateDiscount(
              dto.promotion_code,
              subtotal,
            );
          if (!result.valid) {
            throw new BusinessException(
              "PROMOTION_INVALID",
              400,
              result.reason ?? "Mã khuyến mãi không hợp lệ.",
            );
          }
          discountAmount = result.discount_amount;
          appliedPromotionCode = dto.promotion_code.trim().toUpperCase();
          appliedPromotionType = result.promotion_type ?? null;
          appliedPromotionValue = result.promotion_value ?? null;
        }

        const totalAmount = subtotal - discountAmount;

        const orderRepo = manager.getRepository(Order);
        const orderEntity = orderRepo.create({
          branchId: openShift.branchId,
          shiftId: openShift.id,
          createdBy: user.id,
          status: "completed",
          paymentMethod: dto.payment_method,
          paymentStatus,
          discountAmount,
          totalAmount,
          promotionCode: appliedPromotionCode,
          promotionType: appliedPromotionType,
          promotionValue: appliedPromotionValue,
        });
        const savedOrder = await orderRepo.save(orderEntity);

        const itemRepo = manager.getRepository(OrderItem);
        const itemEntities = lineItems.map((li) =>
          itemRepo.create({
            orderId: savedOrder.id,
            productId: li.productId,
            productName: li.productName,
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

    let qr: QrResult | undefined;
    if (isTransfer) {
      try {
        const zaloPayResult = await this.zaloPayService.createOrder({
          app_user: String(user.id),
          amount: Number(order.totalAmount),
          description: `DH${order.id}`,
          embed_data: { order_id: order.id },
          item: items.map((it) => ({
            id: it.productId,
            quantity: it.quantity,
            price: Number(it.unitPrice),
          })),
        });

        // Lưu app_trans_id vào DB để đối chiếu
        order.zalopayAppTransId = zaloPayResult.app_trans_id;
        await this.ordersRepository.update(order.id, {
          zalopayAppTransId: zaloPayResult.app_trans_id,
        });

        const orderUrl = zaloPayResult.order_url ?? "";
        const image = await QRCode.toDataURL(orderUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 300,
        });

        qr = {
          content: orderUrl,
          image: image as string,
        };
      } catch (error) {
        this.logger.error(
          "Failed to create ZaloPay order, rolling back DB transaction...",
          error,
        );

        // Hoàn lại kho và hủy đơn nếu ZaloPay API lỗi
        await this.dataSource.transaction(async (manager) => {
          const orderRepo = manager.getRepository(Order);
          const productRepo = manager.getRepository(Product);

          for (const item of items) {
            const product = await productRepo.findOne({
              where: { id: item.productId },
            });
            if (product) {
              product.stockQuantity += item.quantity;
              await productRepo.save(product);
            }
          }

          order.status = "cancelled";
          await orderRepo.save(order);
        });

        for (const item of items) {
          try {
            await this.productsService.evictCacheForProduct(item.productId);
          } catch {}
        }

        throw new BusinessException(
          "ZALOPAY_CREATE_ERROR",
          500,
          `Không thể tạo giao dịch ZaloPay: ${error.message || error}`,
        );
      }
    }

    return this.toDto(order, items, qr);
  }

  async confirmPayment(id: number, user: AuthUser): Promise<OrderDataDto> {
    const { order, items } = await this.dataSource.transaction(
      async (manager) => {
        const orderRepo = manager.getRepository(Order);

        const order = await orderRepo
          .createQueryBuilder("o")
          .setLock("pessimistic_write")
          .where("o.id = :id", { id })
          .getOne();

        if (!order) {
          throw new BusinessException(
            "ORDER_NOT_FOUND",
            404,
            "Không tìm thấy đơn hàng.",
          );
        }

        if (order.paymentMethod !== "transfer") {
          throw new BusinessException(
            "ORDER_NOT_TRANSFER_PAYMENT",
            400,
            "Đơn hàng này không dùng hình thức chuyển khoản, không cần xác nhận thanh toán.",
          );
        }

        if (order.paymentStatus === "paid") {
          throw new BusinessException(
            "ORDER_ALREADY_PAID",
            409,
            "Đơn hàng này đã được xác nhận thanh toán trước đó.",
          );
        }

        // Kiểm tra RBAC: chỉ admin hoặc chính người tạo đơn hàng mới được xác nhận
        if (!user.roles.includes("admin") && order.createdBy !== user.id) {
          throw new BusinessException(
            "FORBIDDEN",
            403,
            "Bạn không có quyền xác nhận thanh toán cho đơn hàng này.",
          );
        }

        order.paymentStatus = "paid";
        const saved = await orderRepo.save(order);

        const items = await manager
          .getRepository(OrderItem)
          .find({ where: { orderId: id } });

        return { order: saved, items };
      },
    );

    return this.toDto(order, items);
  }

  async findAll(
    query: QueryOrderDto,
    user: AuthUser,
  ): Promise<{ data: OrderDataDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const branchId = this.resolveBranchFilter(user, query.branch_id);

    const qb = this.ordersRepository
      .createQueryBuilder("o")
      .where("o.deleted_at IS NULL");

    if (branchId) {
      qb.andWhere("o.branch_id = :branchId", { branchId });
    }
    if (query.status) {
      qb.andWhere("o.status = :status", { status: query.status });
    }
    if (query.payment_status) {
      qb.andWhere("o.payment_status = :paymentStatus", {
        paymentStatus: query.payment_status,
      });
    }

    if (query.from_date) {
      qb.andWhere("o.created_at >= :fromDate", {
        fromDate: new Date(`${query.from_date}T00:00:00+07:00`),
      });
    }
    if (query.to_date) {
      qb.andWhere("o.created_at <= :toDate", {
        toDate: new Date(`${query.to_date}T23:59:59+07:00`),
      });
    }

    if (!user.roles.includes("admin")) {
      qb.andWhere("o.created_by = :selfId", { selfId: user.id });
    } else if (query.created_by) {
      qb.andWhere("o.created_by = :createdBy", {
        createdBy: query.created_by,
      });
    }

    qb.orderBy("o.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      rows.map(async (order) => {
        const items = await this.orderItemsRepository.find({
          where: { orderId: order.id },
        });
        return this.toDto(order, items);
      }),
    );

    return {
      data,
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOne(id: number): Promise<OrderDataDto> {
    const order = await this.ordersRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!order) {
      throw new BusinessException(
        "ORDER_NOT_FOUND",
        404,
        "Không tìm thấy đơn hàng.",
      );
    }
    const items = await this.orderItemsRepository.find({
      where: { orderId: id },
    });
    return this.toDto(order, items);
  }

  async cancel(id: number, user: AuthUser): Promise<OrderDataDto> {
    const orderToCheck = await this.ordersRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!orderToCheck) {
      throw new BusinessException(
        "ORDER_NOT_FOUND",
        404,
        "Không tìm thấy đơn hàng.",
      );
    }
    if (orderToCheck.status === "cancelled") {
      throw new BusinessException(
        "ORDER_ALREADY_CANCELLED",
        409,
        "Đơn hàng này đã được hủy trước đó.",
      );
    }
    if (!user.roles.includes("admin") && orderToCheck.createdBy !== user.id) {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền hủy đơn hàng này.",
      );
    }

    if (
      orderToCheck.paymentMethod === "transfer" &&
      orderToCheck.zalopayAppTransId &&
      orderToCheck.paymentStatus !== "paid"
    ) {
      try {
        const zpResult = await this.zaloPayService.cancelOrder({
          app_trans_id: orderToCheck.zalopayAppTransId,
        });
        if (zpResult.return_code !== 1) {
          if (zpResult.sub_return_code === -403) {
            throw new BusinessException(
              "ORDER_ALREADY_PAID",
              409,
              "Đơn hàng đã được thanh toán trên ZaloPay, không thể hủy. Vui lòng làm thủ tục hoàn tiền.",
            );
          } else if (zpResult.sub_return_code !== -101) {
            throw new BusinessException(
              "ZALOPAY_CANCEL_ERROR",
              400,
              `Không thể hủy giao dịch trên ZaloPay: ${zpResult.return_message} (Mã lỗi: ${zpResult.sub_return_code})`,
            );
          }
        }
      } catch (error) {
        if (error instanceof BusinessException) {
          throw error;
        }
        this.logger.warn(
          `Lỗi khi gọi hủy đơn ZaloPay: ${error.message || error}`,
        );
      }
    }

    const { order, items } = await this.dataSource.transaction(
      async (manager) => {
        const orderRepo = manager.getRepository(Order);
        const itemRepo = manager.getRepository(OrderItem);
        const productRepo = manager.getRepository(Product);

        const lockedOrder = await orderRepo
          .createQueryBuilder("o")
          .setLock("pessimistic_write")
          .where("o.id = :id", { id })
          .getOne();

        if (!lockedOrder) {
          throw new BusinessException(
            "ORDER_NOT_FOUND",
            404,
            "Không tìm thấy đơn hàng.",
          );
        }
        if (lockedOrder.status === "cancelled") {
          throw new BusinessException(
            "ORDER_ALREADY_CANCELLED",
            409,
            "Đơn hàng này đã được hủy trước đó.",
          );
        }

        const orderItems = await itemRepo.find({ where: { orderId: id } });
        const sortedItems = [...orderItems].sort(
          (a, b) => a.productId - b.productId,
        );

        for (const item of sortedItems) {
          const product = await productRepo
            .createQueryBuilder("p")
            .setLock("pessimistic_write")
            .where("p.id = :id", { id: item.productId })
            .getOne();
          if (product) {
            product.stockQuantity += item.quantity;
            await productRepo.save(product);
          }
        }

        lockedOrder.status = "cancelled";
        const savedOrder = await orderRepo.save(lockedOrder);

        return { order: savedOrder, items: orderItems };
      },
    );

    for (const item of items) {
      try {
        await this.productsService.evictCacheForProduct(item.productId);
      } catch {
        // đã có log/warn bên trong RedisService
      }
    }

    return this.toDto(order, items);
  }

  private resolveBranchFilter(
    user: AuthUser,
    queryBranchId?: number,
  ): number | undefined {
    if (!user.roles.includes("admin")) {
      return user.branchId ?? undefined;
    }
    return queryBranchId;
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

  private toDto(order: Order, items: OrderItem[], qr?: QrResult): OrderDataDto {
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
        product_name: it.productName ?? null,
        quantity: it.quantity,
        unit_price: Number(it.unitPrice),
      })),
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      qr_content: qr?.content ?? null,
      qr_code: qr?.image ?? null,
      zalopay_app_trans_id: order.zalopayAppTransId ?? null,
      zalopay_zp_trans_id: order.zalopayZpTransId ?? null,
      promotion_code: order.promotionCode ?? null,
      promotion_type: order.promotionType ?? null,
      promotion_value:
        order.promotionValue != null ? Number(order.promotionValue) : null,
    };
  }
}
