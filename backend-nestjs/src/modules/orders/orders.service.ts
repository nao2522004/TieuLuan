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
import {
  buildVietQrPayload,
  generateVietQrImage,
} from "../../common/utils/vietqr.util";

interface LineItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

interface QrResult {
  content: string;
  image: string;
}

@Injectable()
export class OrdersService {
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

    const isTransfer = dto.payment_method === "transfer";
    let bankInfo: {
      bankBin: string;
      bankAccountNo: string;
      bankAccountName: string;
    } | null = null;

    if (isTransfer) {
      const branch = await this.branchesService.findOne(openShift.branchId);
      if (
        !branch.bank_bin ||
        !branch.bank_account_no ||
        !branch.bank_account_name
      ) {
        throw new BusinessException(
          "ORDER_BRANCH_NO_BANK_INFO",
          400,
          "Chi nhánh chưa cấu hình thông tin tài khoản nhận tiền (bank_bin/" +
            "bank_account_no/bank_account_name), không thể tạo đơn chuyển khoản.",
        );
      }
      bankInfo = {
        bankBin: branch.bank_bin,
        bankAccountNo: branch.bank_account_no,
        bankAccountName: branch.bank_account_name,
      };
    }

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
          paymentStatus,
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

    let qr: QrResult | undefined;
    if (isTransfer && bankInfo) {
      const content = buildVietQrPayload({
        bankBin: bankInfo.bankBin,
        bankAccountNo: bankInfo.bankAccountNo,
        bankAccountName: bankInfo.bankAccountName,
        amount: Number(order.totalAmount),
        orderId: order.id,
      });
      const image = await generateVietQrImage(content);
      qr = { content, image };
    }

    return this.toDto(order, items, qr);
  }

  async confirmPayment(id: number): Promise<OrderDataDto> {
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
        if (user.role !== "admin" && lockedOrder.createdBy !== user.id) {
          throw new BusinessException(
            "FORBIDDEN",
            403,
            "Bạn không có quyền hủy đơn hàng này.",
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
    if (user.role !== "admin") {
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
        quantity: it.quantity,
        unit_price: Number(it.unitPrice),
      })),
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      qr_content: qr?.content ?? null,
      qr_code: qr?.image ?? null,
    };
  }
}
