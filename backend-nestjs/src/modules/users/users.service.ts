import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { IsNull, In, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./entities/user.entity";
import { Branch } from "../branches/entities/branch.entity";
import { Shift } from "../shifts/entities/shift.entity";
import { ShiftUser } from "../shifts/entities/shift-user.entity";
import { RefreshToken } from "../auth/entities/refresh-token.entity";
import { RolesService } from "../roles/roles.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { UserDto, UserSummaryDto } from "./dto/user-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";
import { AuthUser } from "../../common/guards/jwt-auth.guard";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchesRepository: Repository<Branch>,
    @InjectRepository(Shift)
    private readonly shiftsRepository: Repository<Shift>,
    @InjectRepository(ShiftUser)
    private readonly shiftUsersRepository: Repository<ShiftUser>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly rolesService: RolesService,
    private readonly configService: ConfigService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });
  }

  async findNamesByIds(ids: number[]): Promise<Map<number, string>> {
    const uniqueIds = [...new Set(ids)].filter((id) => id != null);
    if (uniqueIds.length === 0) return new Map();
    const rows = await this.usersRepository.find({
      where: { id: In(uniqueIds) },
      select: ["id", "fullName"],
    });
    return new Map(rows.map((r) => [r.id, r.fullName]));
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async findByIds(ids: number[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.usersRepository.find({
      where: { id: In(ids), deletedAt: IsNull() },
      relations: ["role"],
    });
  }

  async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    branchId?: number | null;
    roleCode?: string;
  }): Promise<User> {
    const role = await this.rolesService.findByCodeOrThrow(
      data.roleCode ?? "cashier",
    );
    const user = this.usersRepository.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash: data.passwordHash,
      branchId: data.branchId ?? null,
      roleId: role.id,
      isActive: true,
    });
    return this.usersRepository.save(user);
  }

  async findAllPaginated(
    query: QueryUsersDto,
  ): Promise<{ data: UserDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.usersRepository
      .createQueryBuilder("u")
      .leftJoinAndSelect("u.role", "r")
      .where("u.deleted_at IS NULL");

    if (query.branch_id !== undefined) {
      qb.andWhere("u.branch_id = :branchId", { branchId: query.branch_id });
    }
    if (query.role_code) {
      qb.andWhere("r.code = :roleCode", { roleCode: query.role_code });
    }
    if (query.is_active !== undefined) {
      qb.andWhere("u.is_active = :isActive", { isActive: query.is_active });
    }

    qb.orderBy("u.id", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((r) => this.toUserDto(r)),
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findFiltered(filters: {
    branchId?: number;
    roleCode?: string;
  }): Promise<UserSummaryDto[]> {
    const query = this.usersRepository
      .createQueryBuilder("u")
      .leftJoinAndSelect("u.role", "r")
      .where("u.deleted_at IS NULL")
      .andWhere("u.is_active = true");

    if (filters.branchId !== undefined) {
      query.andWhere("u.branch_id = :branchId", { branchId: filters.branchId });
    }
    if (filters.roleCode) {
      query.andWhere("r.code = :roleCode", { roleCode: filters.roleCode });
    }

    const rows = await query.getMany();
    return rows.map((u) => ({
      id: u.id,
      full_name: u.fullName,
      email: u.email,
      role: u.role.code,
      branch_id: u.branchId,
      is_active: u.isActive,
    }));
  }

  async findOneOrThrow(id: number): Promise<UserDto> {
    const user = await this.findActiveEntityOrThrow(id);
    return this.toUserDto(user);
  }

  async createByAdmin(dto: CreateUserDto): Promise<UserDto> {
    await this.assertEmailNotTaken(dto.email);
    if (dto.branch_id !== undefined) {
      await this.assertBranchExists(dto.branch_id);
    }

    const passwordHash = await this.hashPassword(dto.password);
    const saved = await this.create({
      fullName: dto.full_name,
      email: dto.email,
      passwordHash,
      branchId: dto.branch_id ?? null,
      roleCode: dto.role_code ?? "cashier",
    });

    const withRole = await this.findActiveEntityOrThrow(saved.id);
    return this.toUserDto(withRole);
  }

  async updateByAdmin(
    id: number,
    dto: UpdateUserDto,
    currentUser: AuthUser,
  ): Promise<UserDto> {
    const user = await this.findActiveEntityOrThrow(id);
    const isSelf = user.id === currentUser.id;

    if (
      dto.role_code !== undefined &&
      isSelf &&
      dto.role_code !== user.role.code
    ) {
      throw new BusinessException(
        "USER_CANNOT_CHANGE_OWN_ROLE",
        400,
        "Không thể tự thay đổi vai trò của chính mình.",
      );
    }
    if (dto.is_active === false && isSelf) {
      throw new BusinessException(
        "USER_CANNOT_LOCK_SELF",
        400,
        "Không thể tự khóa tài khoản của chính mình.",
      );
    }

    if (dto.full_name !== undefined) {
      user.fullName = dto.full_name;
    }
    if (dto.branch_id !== undefined) {
      await this.assertBranchExists(dto.branch_id);
      user.branchId = dto.branch_id;
    }
    if (dto.role_code !== undefined) {
      const role = await this.rolesService.findByCodeOrThrow(dto.role_code);
      user.roleId = role.id;
      user.role = role;
    }

    const wasActive = user.isActive;
    if (dto.is_active !== undefined) {
      user.isActive = dto.is_active;
    }

    const saved = await this.usersRepository.save(user);

    //khóa tài khoản -> thu hồi toàn bộ refresh_token còn hiệu lực
    if (wasActive && dto.is_active === false) {
      await this.revokeAllRefreshTokens(saved.id);
    }

    return this.toUserDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findActiveEntityOrThrow(id);

    const openAsLeader = await this.shiftsRepository.findOne({
      where: { userId: id, closedAt: IsNull() },
    });
    const openAsCashier = await this.shiftUsersRepository
      .createQueryBuilder("su")
      .innerJoin("su.shift", "s")
      .where("su.user_id = :id", { id })
      .andWhere("s.closed_at IS NULL")
      .getOne();

    if (openAsLeader || openAsCashier) {
      throw new BusinessException(
        "USER_HAS_OPEN_SHIFT",
        409,
        "Không thể xóa nhân viên đang có ca làm việc chưa đóng.",
      );
    }

    user.deletedAt = new Date();
    user.isActive = false;
    await this.usersRepository.save(user);
    await this.revokeAllRefreshTokens(id);

    return { message: "Xóa nhân viên thành công." };
  }

  async changeOwnPassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.findActiveEntityOrThrow(userId);

    const matches = await bcrypt.compare(dto.old_password, user.passwordHash);
    if (!matches) {
      throw new BusinessException(
        "AUTH_INVALID_OLD_PASSWORD",
        401,
        "Mật khẩu cũ không đúng.",
      );
    }

    user.passwordHash = await this.hashPassword(dto.new_password);
    await this.usersRepository.save(user);

    return { message: "Đổi mật khẩu thành công." };
  }

  async resetPasswordByAdmin(
    id: number,
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.findActiveEntityOrThrow(id);

    user.passwordHash = await this.hashPassword(dto.new_password);
    await this.usersRepository.save(user);
    await this.revokeAllRefreshTokens(id);

    return {
      message:
        "Reset mật khẩu thành công. Mọi phiên đăng nhập cũ của nhân viên này đã bị vô hiệu hóa.",
    };
  }

  // ─── Helpers ───

  private async hashPassword(plain: string): Promise<string> {
    const saltRounds = parseInt(
      this.configService.get<string>("BCRYPT_SALT_ROUNDS") ?? "10",
      10,
    );
    return bcrypt.hash(plain, saltRounds);
  }

  private async revokeAllRefreshTokens(userId: number): Promise<void> {
    await this.refreshTokensRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where("user_id = :userId", { userId })
      .andWhere("revoked_at IS NULL")
      .execute();
  }

  private async assertEmailNotTaken(email: string): Promise<void> {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new BusinessException(
        "USER_EMAIL_DUPLICATE",
        409,
        "Email đã được sử dụng.",
      );
    }
  }

  private async assertBranchExists(branchId: number): Promise<void> {
    const branch = await this.branchesRepository.findOne({
      where: { id: branchId, deletedAt: IsNull() },
    });
    if (!branch) {
      throw new BusinessException(
        "BRANCH_NOT_FOUND",
        404,
        "Không tìm thấy chi nhánh.",
      );
    }
  }

  private async findActiveEntityOrThrow(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["role"],
    });
    if (!user) {
      throw new BusinessException(
        "USER_NOT_FOUND",
        404,
        "Không tìm thấy nhân viên.",
      );
    }
    return user;
  }

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      role: user.role.code,
      branch_id: user.branchId,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
