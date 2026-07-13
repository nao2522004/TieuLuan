import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
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
      "Bắt buộc đang có ca làm việc mở. Chỉ hỗ trợ payment_method 'cash'/'card' ở tính năng này.",
  })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  @ApiResponse({
    status: 400,
    description:
      "Validate lỗi / chưa mở ca làm việc (SHIFT_REQUIRED) / discount_amount không hợp lệ",
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
}
