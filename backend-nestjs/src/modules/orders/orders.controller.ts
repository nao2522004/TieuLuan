import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrderBranchAccessGuard } from "../../common/guards/order-branch-access.guard";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary:
      "Tạo đơn hàng - row-lock (SELECT ... FOR UPDATE) trừ kho trong 1 transaction. " +
      "Bắt buộc đang có ca làm việc mở. Hỗ trợ 'cash'/'card' (paid ngay) và " +
      "'transfer' (pending, response kèm qr_content/qr_code VietQR).",
  })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  @ApiResponse({
    status: 400,
    description:
      "Validate lỗi / chưa mở ca làm việc (SHIFT_REQUIRED) / discount_amount không hợp lệ / " +
      "chi nhánh chưa có bank info khi payment_method='transfer' (ORDER_BRANCH_NO_BANK_INFO)",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy sản phẩm trong chi nhánh của ca đang mở",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description: "Không đủ tồn kho (INVENTORY_INSUFFICIENT)",
    type: ApiErrorResponse,
  })
  create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    return this.ordersService.create(dto, req.user!);
  }

  @Patch(":id/confirm-payment")
  @UseGuards(OrderBranchAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Xác nhận đã nhận tiền cho đơn payment_method='transfer' (payment_status " +
      "pending -> paid). Chỉ admin hoặc user cùng chi nhánh với đơn hàng (OrderBranchAccessGuard).",
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({
    status: 400,
    description:
      "Đơn hàng không dùng hình thức chuyển khoản (ORDER_NOT_TRANSFER_PAYMENT)",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: "Không cùng chi nhánh và không phải admin",
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  @ApiResponse({
    status: 409,
    description:
      "Đơn hàng đã được xác nhận thanh toán trước đó (ORDER_ALREADY_PAID)",
    type: ApiErrorResponse,
  })
  confirmPayment(@Param("id", ParseIntIdPipe) id: number) {
    return this.ordersService.confirmPayment(id);
  }
}
