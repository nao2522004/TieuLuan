import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { ZaloPayService } from "./zalopay.service";
import { CreateZaloPayOrderDto } from "./dto/create-order.dto";
import { QueryZaloPayOrderDto } from "./dto/query-order.dto";
import { CancelZaloPayOrderDto } from "./dto/cancel-order.dto";
import { RefundZaloPayOrderDto } from "./dto/refund-order.dto";
import { QueryRefundStatusDto } from "./dto/query-refund.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Order } from "../orders/entities/order.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { Product } from "../products/entities/product.entity";
import { Return } from "../returns/entities/return.entity";
import { ProductsService } from "../products/products.service";

@ApiTags("zalopay")
@Controller("payment/zalopay")
export class ZaloPayController {
  private readonly logger = new Logger(ZaloPayController.name);

  constructor(
    private readonly zaloPayService: ZaloPayService,
    private readonly productsService: ProductsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Return)
    private readonly returnsRepository: Repository<Return>,
  ) {}

  @Post("create-order")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Tạo đơn hàng ZaloPay trực tiếp" })
  async createOrder(@Body() dto: CreateZaloPayOrderDto) {
    return this.zaloPayService.createOrder(dto);
  }

  @Post("query-order")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Truy vấn trạng thái đơn hàng ZaloPay và cập nhật DB",
  })
  async queryOrder(@Body() dto: QueryZaloPayOrderDto) {
    const result = await this.zaloPayService.queryOrder(dto);

    // Nếu thanh toán thành công (return_code === 1)
    if (result.return_code === 1) {
      const appTransId = dto.app_trans_id;
      const zpTransId = String(result.zp_trans_id);

      await this.dataSource.transaction(async (manager) => {
        const orderRepo = manager.getRepository(Order);
        const order = await orderRepo
          .createQueryBuilder("o")
          .setLock("pessimistic_write")
          .where("o.zalopayAppTransId = :appTransId", { appTransId })
          .getOne();

        if (order && order.paymentStatus !== "paid") {
          order.paymentStatus = "paid";
          order.zalopayZpTransId = zpTransId;
          await orderRepo.save(order);
          this.logger.log(
            `Order ID=${order.id} marked as PAID via queryOrder.`,
          );
        }
      });
    }

    return result;
  }

  @Post("cancel-order")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hủy đơn hàng ZaloPay và hoàn lại tồn kho" })
  async cancelOrder(@Body() dto: CancelZaloPayOrderDto) {
    const result = await this.zaloPayService.cancelOrder(dto);

    if (result.return_code === 1) {
      const appTransId = dto.app_trans_id;

      const updatedOrder = await this.dataSource.transaction(
        async (manager) => {
          const orderRepo = manager.getRepository(Order);
          const itemRepo = manager.getRepository(OrderItem);
          const productRepo = manager.getRepository(Product);

          const order = await orderRepo
            .createQueryBuilder("o")
            .setLock("pessimistic_write")
            .where("o.zalopayAppTransId = :appTransId", { appTransId })
            .getOne();

          if (!order) {
            return null;
          }

          if (order.status === "cancelled") {
            return order;
          }

          const orderItems = await itemRepo.find({
            where: { orderId: order.id },
          });
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

          order.status = "cancelled";
          const savedOrder = await orderRepo.save(order);

          // Evict caches
          for (const item of orderItems) {
            try {
              await this.productsService.evictCacheForProduct(item.productId);
            } catch (e) {
              this.logger.warn(
                `Failed to evict cache for product ID=${item.productId}: ${e.message}`,
              );
            }
          }

          return savedOrder;
        },
      );

      if (updatedOrder) {
        this.logger.log(
          `Order ID=${updatedOrder.id} cancelled due to ZaloPay cancellation.`,
        );
      }
    }

    return result;
  }

  @Post("refund")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Hoàn tiền giao dịch ZaloPay và cập nhật Return record",
  })
  async refund(@Body() dto: RefundZaloPayOrderDto) {
    const result = await this.zaloPayService.refund(dto);

    if (result.return_code === 1 && dto.return_id) {
      const returnId = dto.return_id;
      const mRefundId = result.m_refund_id;
      const refundId = String(result.refund_id ?? "");

      await this.returnsRepository.update(returnId, {
        zalopayMRefundId: mRefundId,
        zalopayRefundId: refundId,
        zalopayRefundStatus: "pending",
      });
      this.logger.log(
        `Return ID=${returnId} updated with ZaloPay m_refund_id=${mRefundId} (status: pending).`,
      );
    }

    return result;
  }

  @Post("query-refund-status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Truy vấn trạng thái hoàn tiền ZaloPay và cập nhật Return",
  })
  async queryRefundStatus(@Body() dto: QueryRefundStatusDto) {
    const result = await this.zaloPayService.queryRefundStatus(dto);

    const mRefundId = dto.m_refund_id;
    if (result.return_code === 1) {
      await this.returnsRepository.update(
        { zalopayMRefundId: mRefundId },
        { zalopayRefundStatus: "success" },
      );
      this.logger.log(
        `Return with m_refund_id=${mRefundId} marked as refund success.`,
      );
    } else if (result.return_code === 2) {
      await this.returnsRepository.update(
        { zalopayMRefundId: mRefundId },
        { zalopayRefundStatus: "failed" },
      );
      this.logger.log(
        `Return with m_refund_id=${mRefundId} marked as refund failed.`,
      );
    }

    return result;
  }

  // Endpoint nhận callback (webhook) từ ZaloPay Server.
  @Post("callback")
  @HttpCode(200)
  @ApiOperation({ summary: "Webhook nhận kết quả thanh toán từ ZaloPay" })
  async callback(@Body() body: { data: string; mac: string; type: number }) {
    const isValid = this.zaloPayService.verifyCallback(body.data, body.mac);

    if (!isValid) {
      this.logger.warn("Invalid ZaloPay callback MAC");
      return { return_code: -1, return_message: "mac not equal" };
    }

    try {
      const orderData = JSON.parse(body.data);
      const appTransId = orderData.app_trans_id;
      const zpTransId = String(orderData.zp_trans_id);

      this.logger.log(
        `Callback OK - app_trans_id=${appTransId}, amount=${orderData.amount}, zp_trans_id=${zpTransId}`,
      );

      await this.dataSource.transaction(async (manager) => {
        const orderRepo = manager.getRepository(Order);
        const order = await orderRepo
          .createQueryBuilder("o")
          .setLock("pessimistic_write")
          .where("o.zalopayAppTransId = :appTransId", { appTransId })
          .getOne();

        if (!order) {
          throw new Error(
            `Order not found for zalopayAppTransId=${appTransId}`,
          );
        }

        if (order.paymentStatus === "paid") {
          this.logger.log(`Order ID=${order.id} is already paid. Skipping.`);
          return;
        }

        order.paymentStatus = "paid";
        order.zalopayZpTransId = zpTransId;
        await orderRepo.save(order);
        this.logger.log(`Order ID=${order.id} payment status updated to paid.`);
      });

      return { return_code: 1, return_message: "success" };
    } catch (error) {
      this.logger.error("Callback processing error", error);
      // return_code = 0 -> ZaloPay sẽ gọi lại callback (tối đa 3 lần)
      return { return_code: 0, return_message: error.message };
    }
  }
}
