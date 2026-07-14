import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { QueryRevenueReportDto } from "./dto/query-revenue-report.dto";
import { RevenueReportResponseDto } from "./dto/revenue-report-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("revenue")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary:
      "Báo cáo doanh thu (chỉ admin) - KHÔNG lọc deleted_at, tính cả sản " +
      "phẩm/nhân viên đã soft-delete (Mục 9 ruleset). Không truyền branch_id " +
      "= tổng hợp toàn hệ thống.",
  })
  @ApiResponse({ status: 200, type: RevenueReportResponseDto })
  @ApiResponse({
    status: 400,
    description: "from_date lớn hơn to_date",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: "Không phải admin",
    type: ApiErrorResponse,
  })
  revenue(@Query() query: QueryRevenueReportDto) {
    return this.reportsService.revenue(query);
  }
}
