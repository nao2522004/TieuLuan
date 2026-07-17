import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsersService } from "./users.service";

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
  me(@Req() req: Request) {
    return req.user;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Danh sách tài khoản nhân viên (lọc theo chi nhánh và vai trò)",
  })
  findAll(
    @Query("branch_id") branchId?: string,
    @Query("role_code") roleCode?: string,
  ) {
    const bId = branchId ? parseInt(branchId, 10) : undefined;
    return this.usersService.findFiltered({ branchId: bId, roleCode });
  }

  @Get("admin-only-demo")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary:
      "Demo test RolesGuard - chỉ admin gọi được. Xóa khi Categories/Products CRUD có endpoint admin-only thật.",
  })
  adminOnlyDemo() {
    return { message: "Chỉ admin mới thấy được message này." };
  }
}
