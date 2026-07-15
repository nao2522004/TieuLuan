import {
  Body,
  Controller,
  Get,
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
import { ShiftsService } from "./shifts.service";
import { OpenShiftDto } from "./dto/open-shift.dto";
import { CloseShiftDto } from "./dto/close-shift.dto";
import { QueryShiftDto } from "./dto/query-shift.dto";
import {
  ShiftResponseDto,
  PaginatedShiftResponseDto,
} from "./dto/shift-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("shifts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("shifts")
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post("open")
  @ApiOperation({
    summary:
      "Mở ca làm việc mới cho user đang đăng nhập (mức tối giản - phục vụ Orders)",
  })
  @ApiResponse({ status: 201, type: ShiftResponseDto })
  @ApiResponse({
    status: 400,
    description: "Thiếu branch_id (tài khoản không gắn chi nhánh) hoặc validate lỗi",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description: "Đang có 1 ca chưa đóng",
    type: ApiErrorResponse,
  })
  open(@Body() dto: OpenShiftDto, @Req() req: Request) {
    return this.shiftsService.open(dto, req.user!);
  }

  @Patch(":id/close")
  @ApiOperation({
    summary:
      "Đóng ca làm việc, tính expected_cash mức tối giản (chưa trừ Returns)",
  })
  @ApiResponse({ status: 200, type: ShiftResponseDto })
  @ApiResponse({
    status: 403,
    description: "Không phải chủ ca / không phải admin",
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  @ApiResponse({
    status: 409,
    description: "Ca đã đóng trước đó",
    type: ApiErrorResponse,
  })
  close(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: CloseShiftDto,
    @Req() req: Request,
  ) {
    return this.shiftsService.close(id, dto, req.user!);
  }

  @Get()
  @ApiOperation({
    summary:
      "Danh sách tất cả ca làm việc (phân trang). Staff chỉ xem được ca của " +
      "chi nhánh mình (hoặc chính mình); admin xem toàn hệ thống hoặc lọc theo branch_id.",
  })
  @ApiResponse({ status: 200, type: PaginatedShiftResponseDto })
  findAll(@Query() query: QueryShiftDto, @Req() req: Request) {
    return this.shiftsService.findAll(query, req.user!);
  }
}
