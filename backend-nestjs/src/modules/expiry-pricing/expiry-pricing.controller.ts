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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ExpiryPricingService } from "./expiry-pricing.service";
import { CreateExpiryDiscountRuleDto } from "./dto/create-expiry-discount-rule.dto";
import { UpdateExpiryDiscountRuleDto } from "./dto/update-expiry-discount-rule.dto";
import {
  ExpiryDiscountRuleResponseDto,
  ExpiryDiscountRuleListResponseDto,
} from "./dto/expiry-discount-rule-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("expiry-pricing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("expiry-discount-rules")
export class ExpiryPricingController {
  constructor(private readonly service: ExpiryPricingService) {}

  @Get()
  @ApiOperation({
    summary:
      "Danh sách quy tắc giảm giá theo hạn dùng (mọi user đã đăng nhập đều xem được)",
  })
  @ApiResponse({ status: 200, type: ExpiryDiscountRuleListResponseDto })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Tạo quy tắc giảm giá cận hạn mới (chỉ admin)" })
  @ApiResponse({ status: 201, type: ExpiryDiscountRuleResponseDto })
  create(@Body() dto: CreateExpiryDiscountRuleDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Cập nhật quy tắc (chỉ admin)" })
  @ApiResponse({ status: 200, type: ExpiryDiscountRuleResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  update(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: UpdateExpiryDiscountRuleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xóa mềm quy tắc (chỉ admin)" })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  remove(@Param("id", ParseIntIdPipe) id: number) {
    return this.service.remove(id);
  }
}
