import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { ReturnsService } from "./returns.service";
import { CreateReturnDto } from "./dto/create-return.dto";
import { ReturnResponseDto } from "./dto/return-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

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
}
