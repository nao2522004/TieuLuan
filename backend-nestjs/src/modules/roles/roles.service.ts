import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role } from "./entities/role.entity";
import { BusinessException } from "../../common/exceptions/business.exception";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  findAll(): Promise<Role[]> {
    return this.rolesRepository.find({ order: { id: "ASC" } });
  }

  async findByCodeOrThrow(code: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { code } });
    if (!role) {
      throw new BusinessException(
        "ROLE_NOT_FOUND",
        404,
        `Không tìm thấy role '${code}'.`,
      );
    }
    return role;
  }
}
