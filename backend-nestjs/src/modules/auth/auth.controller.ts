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

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
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
}
