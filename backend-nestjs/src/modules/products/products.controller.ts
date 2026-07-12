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
  UseGuards,
} from "@nestjs/common";
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
import {
  PaginatedProductResponseDto,
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
