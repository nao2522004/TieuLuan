import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { ApiErrorResponse } from "../../common/dto/api-response.dto";
import { Throttle } from "@nestjs/throttler";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // chống brute-force: tối đa 5 lần/phút
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Đăng nhập - dùng luôn tài khoản seed sẵn để test" })
  @ApiResponse({
    status: 200,
    description: "Đăng nhập thành công",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Sai email hoặc mật khẩu",
    type: ApiErrorResponse,
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Đăng xuất - thu hồi refresh token hiện tại" })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cấp access token mới từ refresh token" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }
}
