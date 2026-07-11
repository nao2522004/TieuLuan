import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
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

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    const user = this.usersRepository.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash: data.passwordHash,
      role: "staff",
      isActive: true,
    });
    return this.usersRepository.save(user);
  }
}
