import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { DataSource, IsNull, In, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./entities/user.entity";
import { UserRole as UserRoleEntity } from "./entities/user-role.entity";
import { Role } from "../roles/entities/role.entity";
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
    @InjectRepository(UserRoleEntity)
    private readonly userRolesRepository: Repository<UserRoleEntity>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ["roles"],
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
    return this.usersRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["roles"],
    });
  }

  async findByIds(ids: number[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.usersRepository.find({
      where: { id: In(ids), deletedAt: IsNull() },
      relations: ["roles"],
    });
  }

  async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    branchId?: number | null;
    roleCodes?: string[];
  }): Promise<User> {
    const codes = data.roleCodes?.length ? data.roleCodes : ["cashier"];
    const roles = await this.resolveRolesOrThrow(codes);

    return this.dataSource.transaction(async (manager) => {
      const primaryRole = roles[0];

      const user = manager.getRepository(User).create({
        fullName: data.fullName,
        email: data.email,
        passwordHash: data.passwordHash,
        branchId: data.branchId ?? null,
        roleId: primaryRole.id,
        isActive: true,
      });
      const saved = await manager.getRepository(User).save(user);

      const junctionEntries = roles.map((r) =>
        manager.getRepository(UserRoleEntity).create({
          userId: saved.id,
          roleId: r.id,
        }),
      );
      await manager.getRepository(UserRoleEntity).save(junctionEntries);

      return saved;
    });
  }

  async findAllPaginated(
    query: QueryUsersDto,
  ): Promise<{ data: UserDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.usersRepository
      .createQueryBuilder("u")
      .leftJoinAndSelect("u.roles", "r")
      .where("u.deleted_at IS NULL");

    if (query.branch_id !== undefined) {
      qb.andWhere("u.branch_id = :branchId", { branchId: query.branch_id });
    }
    if (query.role_code) {
      qb.andWhere(
        (qb2) =>
          `EXISTS (${qb2
            .subQuery()
            .select("1")
            .from("user_roles", "ur2")
            .innerJoin("roles", "r2", "r2.id = ur2.role_id")
            .where("ur2.user_id = u.id")
            .andWhere("r2.code = :roleCode")
            .getQuery()})`,
        { roleCode: query.role_code },
      );
    }
    if (query.is_active !== undefined) {
      qb.andWhere("u.is_active = :isActive", { isActive: query.is_active });
    }
    if (query.search) {
      const trimmed = query.search.trim();
      const numericId = parseInt(trimmed, 10);
      if (!isNaN(numericId) && String(numericId) === trimmed) {
        qb.andWhere("u.id = :userId", { userId: numericId });
      } else {
        qb.andWhere("u.full_name ILIKE :search", {
          search: `%${trimmed}%`,
        });
      }
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
      .leftJoinAndSelect("u.roles", "r")
      .where("u.deleted_at IS NULL")
      .andWhere("u.is_active = true");

    if (filters.branchId !== undefined) {
      query.andWhere("u.branch_id = :branchId", {
        branchId: filters.branchId,
      });
    }
    if (filters.roleCode) {
      query.andWhere(
        (qb) =>
          `EXISTS (${qb
            .subQuery()
            .select("1")
            .from("user_roles", "ur2")
            .innerJoin("roles", "r2", "r2.id = ur2.role_id")
            .where("ur2.user_id = u.id")
            .andWhere("r2.code = :roleCode")
            .getQuery()})`,
        { roleCode: filters.roleCode },
      );
    }

    const rows = await query.getMany();
    return rows.map((u) => ({
      id: u.id,
      full_name: u.fullName,
      email: u.email,
      roles: (u.roles ?? []).map((r) => r.code),
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
      roleCodes: dto.role_codes?.length ? dto.role_codes : ["cashier"],
    });

    const withRoles = await this.findActiveEntityOrThrow(saved.id);
    return this.toUserDto(withRoles);
  }

  async updateByAdmin(
    id: number,
    dto: UpdateUserDto,
    currentUser: AuthUser,
  ): Promise<UserDto> {
    const user = await this.findActiveEntityOrThrow(id);
    const isSelf = user.id === currentUser.id;

    // Không tự thay đổi role của chính mình
    if (dto.role_codes !== undefined && isSelf) {
      const currentCodes = (user.roles ?? []).map((r) => r.code).sort();
      const newCodes = [...dto.role_codes].sort();
      if (JSON.stringify(currentCodes) !== JSON.stringify(newCodes)) {
        throw new BusinessException(
          "USER_CANNOT_CHANGE_OWN_ROLE",
          400,
          "Không thể tự thay đổi vai trò của chính mình.",
        );
      }
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

    const wasActive = user.isActive;
    if (dto.is_active !== undefined) {
      user.isActive = dto.is_active;
    }

    // Dùng update() thay save() để tránh TypeORM sync lại bảng junction user_roles
    const scalarUpdate: Partial<{
      fullName: string;
      branchId: number;
      isActive: boolean;
    }> = {};
    if (dto.full_name !== undefined) scalarUpdate.fullName = dto.full_name;
    if (dto.branch_id !== undefined) scalarUpdate.branchId = dto.branch_id;
    if (dto.is_active !== undefined) scalarUpdate.isActive = dto.is_active;
    if (Object.keys(scalarUpdate).length > 0) {
      await this.usersRepository.update(id, scalarUpdate);
    }

    if (dto.role_codes !== undefined) {
      const newRoles = await this.resolveRolesOrThrow(dto.role_codes);
      await this.userRolesRepository.delete({ userId: id });
      const entries = newRoles.map((r) =>
        this.userRolesRepository.create({ userId: id, roleId: r.id }),
      );
      await this.userRolesRepository.save(entries);

      // Cập nhật legacy roleId field
      await this.usersRepository.update(id, {
        roleId: newRoles[0]?.id ?? null,
      });
    }

    // Khóa tài khoản → thu hồi toàn bộ refresh_token còn hiệu lực
    if (wasActive && dto.is_active === false) {
      await this.revokeAllRefreshTokens(id);
    }

    const fresh = await this.findActiveEntityOrThrow(id);
    return this.toUserDto(fresh);
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

    // Dùng update() thay save() để tránh TypeORM sync lại bảng junction user_roles
    await this.usersRepository.update(id, {
      deletedAt: new Date(),
      isActive: false,
    });
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

    const newHash = await this.hashPassword(dto.new_password);
    // Dùng update() thay save() để tránh TypeORM sync lại bảng junction user_roles
    await this.usersRepository.update(userId, { passwordHash: newHash });
    await this.revokeAllRefreshTokens(userId);

    return {
      message:
        "Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới.",
    };
  }

  async resetPasswordByAdmin(
    id: number,
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.findActiveEntityOrThrow(id);

    const newHash = await this.hashPassword(dto.new_password);
    // Dùng update() thay save() để tránh TypeORM sync lại bảng junction user_roles
    await this.usersRepository.update(id, { passwordHash: newHash });
    await this.revokeAllRefreshTokens(id);

    return {
      message:
        "Reset mật khẩu thành công. Mọi phiên đăng nhập cũ của nhân viên này đã bị vô hiệu hóa.",
    };
  }

  //  Helpers

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
      relations: ["roles"],
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

  private async resolveRolesOrThrow(codes: string[]): Promise<Role[]> {
    const unique = [...new Set(codes)];
    const roles = await this.rolesRepository.find({
      where: { code: In(unique) },
    });
    const found = roles.map((r) => r.code);
    const missing = unique.filter((c) => !found.includes(c));
    if (missing.length) {
      throw new BusinessException(
        "ROLE_NOT_FOUND",
        400,
        `Không tìm thấy role: ${missing.join(", ")}.`,
      );
    }
    return roles;
  }

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      roles: (user.roles ?? []).map((r) => r.code),
      branch_id: user.branchId,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
