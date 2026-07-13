import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";
import { CreateInventoryTransactionDto } from "./dto/create-inventory-transaction.dto";
import { InventoryTransactionResponseDto } from "./dto/inventory-transaction-response.dto";
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

  @Post("transactions")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary:
      "Nhập kho (chỉ type='IN', chỉ admin) - cộng thẳng stock_quantity và " +
      "ghi lịch sử vào inventory_transactions trong 1 transaction có row-lock",
  })
  @ApiResponse({ status: 201, type: InventoryTransactionResponseDto })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy sản phẩm",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: "Không phải admin",
    type: ApiErrorResponse,
  })
  create(@Body() dto: CreateInventoryTransactionDto, @Req() req: Request) {
    return this.inventoryService.createInboundTransaction(dto, req.user!.id);
  }
}
