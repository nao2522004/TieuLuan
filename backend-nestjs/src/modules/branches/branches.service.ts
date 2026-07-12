import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, IsNull, Repository } from "typeorm";
import { Branch } from "./entities/branch.entity";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { QueryBranchDto } from "./dto/query-branch.dto";
import { BranchDto } from "./dto/branch-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchesRepository: Repository<Branch>,
  ) {}

  async findAll(
    query: QueryBranchDto,
  ): Promise<{ data: BranchDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [rows, total] = await this.branchesRepository.findAndCount({
      where: {
        deletedAt: IsNull(),
        ...(query.search ? { name: ILike(`%${query.search}%`) } : {}),
      },
      order: { id: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows.map((row) => this.toDto(row)),
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOne(id: number): Promise<BranchDto> {
    const branch = await this.findActiveOrThrow(id);
    return this.toDto(branch);
  }

  async create(dto: CreateBranchDto): Promise<BranchDto> {
    const entity = this.branchesRepository.create({
      name: dto.name,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      isActive: dto.is_active ?? true,
      bankBin: dto.bank_bin ?? null,
      bankAccountNo: dto.bank_account_no ?? null,
      bankAccountName: dto.bank_account_name ?? null,
    });
    const saved = await this.branchesRepository.save(entity);
    return this.toDto(saved);
  }

  async update(id: number, dto: UpdateBranchDto): Promise<BranchDto> {
    const branch = await this.findActiveOrThrow(id);

    if (dto.name !== undefined) branch.name = dto.name;
    if (dto.address !== undefined) branch.address = dto.address;
    if (dto.phone !== undefined) branch.phone = dto.phone;
    if (dto.is_active !== undefined) branch.isActive = dto.is_active;
    if (dto.bank_bin !== undefined) branch.bankBin = dto.bank_bin;
    if (dto.bank_account_no !== undefined)
      branch.bankAccountNo = dto.bank_account_no;
    if (dto.bank_account_name !== undefined)
      branch.bankAccountName = dto.bank_account_name;

    const saved = await this.branchesRepository.save(branch);
    return this.toDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const branch = await this.findActiveOrThrow(id);
    branch.deletedAt = new Date();
    await this.branchesRepository.save(branch);
    return { message: "Xóa chi nhánh thành công." };
  }

  private async findActiveOrThrow(id: number): Promise<Branch> {
    const branch = await this.branchesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!branch) {
      throw new BusinessException(
        "BRANCH_NOT_FOUND",
        404,
        "Không tìm thấy chi nhánh.",
      );
    }
    return branch;
  }

  private toDto(branch: Branch): BranchDto {
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      is_active: branch.isActive,
      bank_bin: branch.bankBin,
      bank_account_no: branch.bankAccountNo,
      bank_account_name: branch.bankAccountName,
      created_at: branch.createdAt,
      updated_at: branch.updatedAt,
    };
  }
}
