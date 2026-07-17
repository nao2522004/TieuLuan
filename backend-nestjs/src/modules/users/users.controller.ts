import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsersService } from "./users.service";
import { QueryUsersDto } from "./dto/query-users.dto";
import {
  MeDataDto,
  MeResponseDto,
  UsersListResponseDto,
} from "./dto/user-response.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Thông tin user đang đăng nhập (test JwtAuthGuard)",
  })
  @ApiResponse({ status: 200, type: MeResponseDto })
  me(@Req() req: Request): MeDataDto {
    const user = req.user!;
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      branch_id: user.branchId,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Danh sách tài khoản nhân viên (lọc theo chi nhánh và vai trò)",
  })
  @ApiResponse({ status: 200, type: UsersListResponseDto })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findFiltered({
      branchId: query.branch_id,
      roleCode: query.role_code,
    });
  }
}
