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
import { PromotionsService } from "./promotions.service";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import { UpdatePromotionDto } from "./dto/update-promotion.dto";
import { QueryPromotionsDto } from "./dto/query-promotions.dto";
import {
  PromotionResponseDto,
  PaginatedPromotionResponseDto,
  ValidatePromotionResponseDto,
} from "./dto/promotion-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("promotions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("promotions")
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get("validate")
  @ApiOperation({
    summary: "Xác thực mã khuyến mãi & tính toán số tiền giảm giá (Dành cho POS/Thu ngân)",
  })
  @ApiResponse({ status: 200, type: ValidatePromotionResponseDto })
  validatePromotion(
    @Query("code") code: string,
    @Query("amount") amount: string,
  ) {
    const numericAmount = parseFloat(amount || "0");
    return this.promotionsService.validateAndCalculateDiscount(code, numericAmount);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @ApiOperation({ summary: "Danh sách chương trình khuyến mãi (Phân trang)" })
  @ApiResponse({ status: 200, type: PaginatedPromotionResponseDto })
  findAll(@Query() query: QueryPromotionsDto) {
    return this.promotionsService.findAllPaginated(query);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles("admin", "leader")
  @ApiOperation({ summary: "Chi tiết một chương trình khuyến mãi" })
  @ApiResponse({ status: 200, type: PromotionResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  findOne(@Param("id", ParseIntIdPipe) id: number) {
    return this.promotionsService.findOneOrThrow(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tạo chương trình khuyến mãi mới (Chỉ Admin)" })
  @ApiResponse({ status: 201, type: PromotionResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 409, type: ApiErrorResponse })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Cập nhật chương trình khuyến mãi (Chỉ Admin)" })
  @ApiResponse({ status: 200, type: PromotionResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  update(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xóa mềm chương trình khuyến mãi (Chỉ Admin)" })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  remove(@Param("id", ParseIntIdPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
