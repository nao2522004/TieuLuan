import {
  Body,
  Controller,
  Delete,
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
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductDto } from "./dto/query-product.dto";
import { ProductBranchScopeDto } from "./dto/product-branch-scope.dto";
import {
  PaginatedProductResponseDto,
  ProductAlertsResponseDto,
  ProductResponseDto,
} from "./dto/product-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách sản phẩm (phân trang, có cache Redis)" })
  @ApiResponse({ status: 200, type: PaginatedProductResponseDto })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  // ── Ngày 9 ──────────────────────────────────────────────────────────────
  // QUAN TRỌNG: 2 route dưới đây BẮT BUỘC khai báo TRƯỚC @Get(":id"),
  // vì NestJS match route theo đúng thứ tự khai báo trong class - nếu để
  // sau, request GET /products/alerts sẽ rơi vào findOne() với id="alerts"
  // và bị ParseIntIdPipe trả 400 VALIDATION_ERROR sai ý nghĩa.

  @Get("alerts")
  @ApiOperation({
    summary:
      "Cảnh báo tồn kho thấp (stock_quantity <= reorder_level) và sản phẩm " +
      "sắp hết hạn (expiry_date trong X ngày tới, X = PRODUCT_EXPIRY_ALERT_DAYS). " +
      "Luôn query trực tiếp DB, không dùng cache.",
  })
  @ApiResponse({ status: 200, type: ProductAlertsResponseDto })
  @ApiResponse({
    status: 400,
    description: "branch_id bắt buộc khi tài khoản không gắn chi nhánh",
    type: ApiErrorResponse,
  })
  getAlerts(@Query() query: ProductBranchScopeDto, @Req() req: Request) {
    return this.productsService.findAlerts(req.user!, query.branch_id);
  }

  @Get("barcode/:code")
  @ApiOperation({
    summary: "Tra cứu sản phẩm theo barcode - tối ưu cho quầy POS",
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({
    status: 400,
    description: "branch_id bắt buộc khi tài khoản không gắn chi nhánh",
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  getByBarcode(
    @Param("code") code: string,
    @Query() query: ProductBranchScopeDto,
    @Req() req: Request,
  ) {
    return this.productsService.findByBarcode(
      code,
      req.user!,
      query.branch_id,
    );
  }

  // ─────────────────────────────────────────────────────────────────────

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết 1 sản phẩm (có cache Redis)" })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  findOne(@Param("id", ParseIntIdPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Tạo sản phẩm mới (chỉ admin)" })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy branch/category",
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: 409, type: ApiErrorResponse })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Cập nhật sản phẩm (chỉ admin) - evict cache Redis ngay lập tức",
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  @ApiResponse({ status: 409, type: ApiErrorResponse })
  update(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xóa sản phẩm (soft delete, chỉ admin)" })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  remove(@Param("id", ParseIntIdPipe) id: number) {
    return this.productsService.remove(id);
  }
}
