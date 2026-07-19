import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { StocktakesService } from "./stocktakes.service";
import { CreateStocktakeDto } from "./dto/create-stocktake.dto";
import { CreateStocktakeItemDto } from "./dto/create-stocktake-item.dto";
import { QueryStocktakesDto } from "./dto/query-stocktakes.dto";
import {
  StocktakeResponseDto,
  PaginatedStocktakeResponseDto,
} from "./dto/stocktake-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("stocktakes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stocktakes")
export class StocktakesController {
  constructor(private readonly stocktakesService: StocktakesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Mở phiên kiểm kê kho mới (admin/leader) - Chặn nếu đã có phiên đang open cho chi nhánh",
  })
  @ApiResponse({ status: 201, type: StocktakeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  create(@Body() dto: CreateStocktakeDto, @Req() req: Request) {
    return this.stocktakesService.create(dto, req.user!);
  }

  @Post(":id/items")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader", "cashier")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Ghi nhận số lượng đếm tay thực tế của một sản phẩm trong phiên kiểm kê (admin/leader/cashier)",
  })
  @ApiResponse({ status: 201, type: StocktakeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  recordItem(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: CreateStocktakeItemDto,
    @Req() req: Request,
  ) {
    return this.stocktakesService.recordItem(id, dto, req.user!);
  }

  @Patch(":id/close")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Chốt phiên kiểm kê (admin/leader) - Cập nhật stock_quantity, ghi log biến động tồn kho và evict cache",
  })
  @ApiResponse({ status: 200, type: StocktakeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  close(@Param("id", ParseIntIdPipe) id: number, @Req() req: Request) {
    return this.stocktakesService.close(id, req.user!);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader", "cashier")
  @ApiOperation({
    summary: "Chi tiết một phiên kiểm kê kho kèm các sản phẩm được đếm (admin/leader/cashier)",
  })
  @ApiResponse({ status: 200, type: StocktakeResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  findOne(@Param("id", ParseIntIdPipe) id: number, @Req() req: Request) {
    return this.stocktakesService.findOne(id, req.user!);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @ApiOperation({
    summary: "Danh sách các phiên kiểm kê kho có phân trang (admin/leader)",
  })
  @ApiResponse({ status: 200, type: PaginatedStocktakeResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  findAll(@Query() query: QueryStocktakesDto, @Req() req: Request) {
    return this.stocktakesService.findAll(query, req.user!);
  }
}
