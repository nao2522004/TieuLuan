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
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseIntIdPipe } from "../../common/pipes/parse-int-id.pipe";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { UsersService } from "./users.service";
import { QueryUsersDto } from "./dto/query-users.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import {
  MeDataDto,
  MeResponseDto,
  UserResponseDto,
  PaginatedUserResponseDto,
} from "./dto/user-response.dto";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Thông tin user đang đăng nhập" })
  @ApiResponse({ status: 200, type: MeResponseDto })
  me(@Req() req: Request): MeDataDto {
    const user = req.user!;
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      roles: user.roles,
      branch_id: user.branchId,
    };
  }

  @Patch("me/password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Tự đổi mật khẩu (yêu cầu mật khẩu cũ đúng)" })
  @ApiResponse({
    status: 401,
    description: "Mật khẩu cũ không đúng (AUTH_INVALID_OLD_PASSWORD)",
    type: ApiErrorResponse,
  })
  changeOwnPassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    return this.usersService.changeOwnPassword(req.user!.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      "Danh sách nhân viên (phân trang) — lọc theo branch_id/role_code/is_active. " +
      "Mọi tài khoản đã đăng nhập đều gọi được (VD: Trưởng ca cần chọn thu ngân " +
      "khi mở ca), KHÔNG trả về password_hash.",
  })
  @ApiResponse({ status: 200, type: PaginatedUserResponseDto })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAllPaginated(query);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Chi tiết 1 nhân viên (chỉ admin)" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  findOne(@Param("id", ParseIntIdPipe) id: number) {
    return this.usersService.findOneOrThrow(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary:
      "Tạo tài khoản nhân viên mới (chỉ admin) — chỉ nhận full_name, email, " +
      "password, branch_id, role_code (chống Mass Assignment nhờ whitelist DTO).",
  })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy chi nhánh (BRANCH_NOT_FOUND)",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description: "Email đã tồn tại (USER_EMAIL_DUPLICATE)",
    type: ApiErrorResponse,
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createByAdmin(dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary:
      "Cập nhật nhân viên: tên, chi nhánh, vai trò, khóa/mở khóa (chỉ admin). " +
      "Không cho tự đổi vai trò/tự khóa chính mình. Khóa tài khoản sẽ thu hồi " +
      "toàn bộ refresh_token còn hiệu lực của nhân viên đó.",
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  @ApiResponse({
    status: 400,
    description:
      "Tự đổi vai trò / tự khóa chính mình (USER_CANNOT_CHANGE_OWN_ROLE / USER_CANNOT_LOCK_SELF)",
    type: ApiErrorResponse,
  })
  update(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.updateByAdmin(id, dto, req.user!);
  }

  @Patch(":id/reset-password")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Admin reset mật khẩu cho nhân viên (quên mật khẩu) — thu hồi toàn bộ " +
      "refresh_token cũ của nhân viên đó.",
  })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  resetPassword(
    @Param("id", ParseIntIdPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPasswordByAdmin(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Xóa mềm nhân viên (chỉ admin) — chặn nếu đang có ca làm việc chưa đóng " +
      "(dù là trưởng ca hay thu ngân được gán vào ca).",
  })
  @ApiResponse({ status: 404, type: ApiErrorResponse })
  @ApiResponse({
    status: 409,
    description: "Đang có ca làm việc chưa đóng (USER_HAS_OPEN_SHIFT)",
    type: ApiErrorResponse,
  })
  remove(@Param("id", ParseIntIdPipe) id: number) {
    return this.usersService.remove(id);
  }
}
