import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ReturnsService } from "./returns.service";
import { CreateReturnDto } from "./dto/create-return.dto";
import { QueryReturnsDto } from "./dto/query-returns.dto";
import {
  ReturnResponseDto,
  PaginatedReturnResponseDto,
} from "./dto/return-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("returns")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("returns")
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Trả hàng theo từng dòng sản phẩm (order_item_id), hỗ trợ trả từng " +
      "phần. refund_amount tự động tính = quantity × unit_price tại thời " +
      "điểm bán (server tính, không nhận từ client). KHÔNG hoàn lại tồn kho " +
      "(quyết định nghiệp vụ đã chốt ở Ngày 14). Chỉ admin hoặc user cùng " +
      "chi nhánh với đơn hàng chứa dòng sản phẩm này.",
  })
  @ApiResponse({ status: 201, type: ReturnResponseDto })
  @ApiResponse({
    status: 400,
    description: "Số lượng trả vượt quá số lượng còn có thể trả (RETURN_QUANTITY_EXCEEDS)",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: "Không cùng chi nhánh với đơn hàng và không phải admin",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy order_item_id hoặc đơn hàng tương ứng",
    type: ApiErrorResponse,
  })
  create(@Body() dto: CreateReturnDto, @Req() req: Request) {
    return this.returnsService.create(dto, req.user!);
  }

  @Get()
  @ApiOperation({
    summary:
      "Danh sách lịch sử trả hàng (phân trang). Lọc theo order_id/created_by. " +
      "Nếu không phải admin, chỉ được xem lịch sử thuộc chi nhánh của mình.",
  })
  @ApiResponse({ status: 200, type: PaginatedReturnResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  findAll(@Query() query: QueryReturnsDto, @Req() req: Request) {
    return this.returnsService.findAllPaginated(query, req.user!);
  }

  @Get(":id")
  @ApiOperation({
    summary:
      "Xem chi tiết một giao dịch hoàn trả. " +
      "Nếu không phải admin, chỉ được xem nếu giao dịch đó thuộc chi nhánh của mình.",
  })
  @ApiResponse({ status: 200, type: ReturnResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponse })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  findOne(@Param("id", ParseIntIdPipe) id: number, @Req() req: Request) {
    return this.returnsService.findOneOrThrow(id, req.user!);
  }
}
