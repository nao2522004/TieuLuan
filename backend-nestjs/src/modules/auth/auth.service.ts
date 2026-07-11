import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";
import { UsersService } from "../users/users.service";
import { RefreshToken } from "./entities/refresh-token.entity";

import { LoginDto } from "./dto/login.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { User } from "../users/entities/user.entity";

interface PublicUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: Date;
}

interface AuthResult {
  user: PublicUser;
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ip?: string },
  ): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);

    const invalidCredentials = () =>
      new BusinessException(
        "AUTH_INVALID_CREDENTIALS",
        401,
        "Email hoặc mật khẩu không đúng.",
      );

    if (!user) {
      throw invalidCredentials();
    }
    if (!user.isActive) {
      throw new BusinessException(
        "AUTH_ACCOUNT_DISABLED",
        401,
        "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.",
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user, meta);

    return {
      user: this.toPublicUser(user),
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private signAccessToken(user: User): string {
    const expiresIn = parseInt(
      this.configService.get<string>("JWT_ACCESS_EXPIRATION") ?? "900",
      10,
    );
    return this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
        expiresIn,
      },
    );
  }

  private async issueRefreshToken(
    user: User,
    meta: { userAgent?: string; ip?: string },
  ): Promise<string> {
    const rawToken = randomBytes(48).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    const days = parseInt(
      this.configService.get<string>("JWT_REFRESH_EXPIRATION_DAYS") ?? "7",
      10,
    );
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const entity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ip ?? null,
      expiresAt,
    });
    await this.refreshTokenRepository.save(entity);

    return rawToken;
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      is_active: user.isActive,
      created_at: user.createdAt,
    };
  }
}
