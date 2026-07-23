import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../modules/users/users.service";
import { UserRole } from "../../modules/users/entities/user.entity";

interface JwtPayload {
  sub: number;
  email: string;
  roles: UserRole[];
  branchId: number | null;
  pwdHash?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>("JWT_ACCESS_SECRET");
    if (!secret) {
      throw new Error("Thiếu biến môi trường JWT_ACCESS_SECRET.");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }

    // Nếu JWT chứa pwdHash và passwordHash đã thay đổi (do reset/đổi mật khẩu) -> Vô hiệu hóa access token ngay lập tức
    if (payload.pwdHash && user.passwordHash) {
      const currentPwdHash = user.passwordHash.slice(-10);
      if (payload.pwdHash !== currentPwdHash) {
        return null;
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: (user.roles ?? []).map((r) => r.code as UserRole),
      branchId: user.branchId ?? null,
    };
  }
}
