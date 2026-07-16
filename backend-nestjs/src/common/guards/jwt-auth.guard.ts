import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { BusinessException } from "../exceptions/business.exception";
import { UsersService } from "../../modules/users/users.service";
import { UserRole } from "../../modules/users/entities/user.entity";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  branchId: number | null;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    const unauthorized = () =>
      new BusinessException(
        "UNAUTHORIZED",
        401,
        "Thiếu hoặc sai access token.",
      );

    if (!authHeader?.startsWith("Bearer ")) {
      throw unauthorized();
    }
    const token = authHeader.slice("Bearer ".length).trim();

    let payload: { sub: number; email: string; role: UserRole };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      });
    } catch {
      throw unauthorized();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw unauthorized();
    }

    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId ?? null,
    };
    return true;
  }
}
