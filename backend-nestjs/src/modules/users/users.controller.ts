import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Thông tin user đang đăng nhập (test JwtAuthGuard)",
  })
  me(@Req() req: Request) {
    return req.user;
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
