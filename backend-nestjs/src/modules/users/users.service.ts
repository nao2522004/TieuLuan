import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { RolesService } from "../roles/roles.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly rolesService: RolesService,
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

  async findFiltered(filters: { branchId?: number; roleCode?: string }): Promise<User[]> {
    const query = this.usersRepository.createQueryBuilder("u")
      .leftJoinAndSelect("u.role", "r")
      .where("u.deletedAt IS NULL")
      .andWhere("u.isActive = true");

    if (filters.branchId !== undefined) {
      query.andWhere("u.branchId = :branchId", { branchId: filters.branchId });
    }

    if (filters.roleCode) {
      query.andWhere("r.code = :roleCode", { roleCode: filters.roleCode });
    }

    return query.getMany();
  }

  async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    branchId?: number | null;
    roleCode?: string;
  }): Promise<User> {
    const role = await this.rolesService.findByCodeOrThrow(data.roleCode ?? "cashier");
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
}
