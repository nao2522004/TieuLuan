import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

  create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    branchId?: number | null;
  }): Promise<User> {
    const user = this.usersRepository.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash: data.passwordHash,
      branchId: data.branchId ?? null,
      role: "staff",
      isActive: true,
    });
    return this.usersRepository.save(user);
  }
}
