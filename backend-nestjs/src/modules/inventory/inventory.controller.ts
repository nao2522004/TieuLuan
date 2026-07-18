import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
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
import { InventoryService } from "./inventory.service";
import { CreateInventoryTransactionDto } from "./dto/create-inventory-transaction.dto";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { QueryInventoryTransactionsDto } from "./dto/query-inventory-transactions.dto";
import {
  InventoryTransactionResponseDto,
  PaginatedInventoryTransactionsResponseDto,
} from "./dto/inventory-transaction-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("inventory")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post("inbound")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Nhập kho (chỉ type='IN', admin/leader) - cộng thẳng stock_quantity và " +
      "ghi lịch sử vào inventory_transactions với source='INBOUND' trong 1 transaction có row-lock",
  })
  @ApiResponse({ status: 201, type: InventoryTransactionResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  createInbound(
    @Body() dto: CreateInventoryTransactionDto,
    @Req() req: Request,
  ) {
    return this.inventoryService.createInboundTransaction(dto, req.user!);
  }

  @Post("transactions")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Alias cho POST /inventory/inbound để tương thích ngược",
  })
  @ApiResponse({ status: 201, type: InventoryTransactionResponseDto })
  createLegacy(
    @Body() dto: CreateInventoryTransactionDto,
    @Req() req: Request,
  ) {
    return this.inventoryService.createInboundTransaction(dto, req.user!);
  }

  @Post("adjustments")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Ghi nhận hao hụt/hủy hàng (admin/leader) - bắt buộc product_id, quantity, reason. " +
      "Trừ stock_quantity, ghi log type='OUT', source='ADJUSTMENT'. Chặn tồn kho âm ở tầng Service.",
  })
  @ApiResponse({ status: 201, type: InventoryTransactionResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  createAdjustment(@Body() dto: CreateAdjustmentDto, @Req() req: Request) {
    return this.inventoryService.createAdjustment(dto, req.user!);
  }

  @Get("transactions")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @ApiOperation({
    summary:
      "Lịch sử biến động tồn kho (phân trang, admin/leader). Lọc theo product_id/type/source. " +
      "Nếu không phải admin, chỉ được xem các giao dịch của sản phẩm thuộc chi nhánh của mình.",
  })
  @ApiResponse({ status: 200, type: PaginatedInventoryTransactionsResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  findAll(@Query() query: QueryInventoryTransactionsDto, @Req() req: Request) {
    return this.inventoryService.findAllPaginated(query, req.user!);
  }
}
