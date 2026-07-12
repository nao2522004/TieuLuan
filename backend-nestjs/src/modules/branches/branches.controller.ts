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
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { QueryBranchDto } from "./dto/query-branch.dto";
import {
  BranchResponseDto,
  PaginatedBranchResponseDto,
} from "./dto/branch-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";

@ApiTags("branches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách chi nhánh (phân trang)" })
  @ApiResponse({ status: 200, type: PaginatedBranchResponseDto })
  findAll(@Query() query: QueryBranchDto) {
    return this.branchesService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết 1 chi nhánh (kèm bank info)" })
  @ApiResponse({ status: 200, type: BranchResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  findOne(@Param("id", ParseIntIdPipe) id: number) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Tạo chi nhánh mới, kèm bank info (chỉ admin)" })
  @ApiResponse({ status: 201, type: BranchResponseDto })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Cập nhật chi nhánh, bao gồm cả bank info (chỉ admin)",
  })
  @ApiResponse({ status: 200, type: BranchResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  update(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xóa chi nhánh (soft delete, chỉ admin)" })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  remove(@Param("id", ParseIntIdPipe) id: number) {
    return this.branchesService.remove(id);
  }
}
