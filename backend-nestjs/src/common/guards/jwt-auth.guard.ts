import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BusinessException } from "../exceptions/business.exception";
import { UserRole } from "../../modules/users/entities/user.entity";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  roles: UserRole[];
  branchId: number | null;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new BusinessException(
        "UNAUTHORIZED",
        401,
        "Thiếu hoặc sai access token.",
      );
    }
    return user;
  }
}
