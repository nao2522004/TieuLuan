import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "../../modules/users/entities/user.entity";
import { BusinessException } from "../exceptions/business.exception";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền thực hiện hành động này.",
      );
    }
    return true;
  }
}
