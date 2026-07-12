import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, IsNull, Not, Repository } from "typeorm";
import { Category } from "./entities/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { QueryCategoryDto } from "./dto/query-category.dto";
import { CategoryDto } from "./dto/category-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async findAll(
    query: QueryCategoryDto,
  ): Promise<{ data: CategoryDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [rows, total] = await this.categoriesRepository.findAndCount({
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

  async findOne(id: number): Promise<CategoryDto> {
    const category = await this.findActiveOrThrow(id);
    return this.toDto(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    await this.assertNameNotTaken(dto.name);

    const entity = this.categoriesRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      isActive: dto.is_active ?? true,
    });
    const saved = await this.categoriesRepository.save(entity);
    return this.toDto(saved);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const category = await this.findActiveOrThrow(id);

    if (dto.name !== undefined && dto.name !== category.name) {
      await this.assertNameNotTaken(dto.name, id);
      category.name = dto.name;
    }
    if (dto.description !== undefined) {
      category.description = dto.description;
    }
    if (dto.is_active !== undefined) {
      category.isActive = dto.is_active;
    }

    const saved = await this.categoriesRepository.save(category);
    return this.toDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const category = await this.findActiveOrThrow(id);
    category.deletedAt = new Date();
    await this.categoriesRepository.save(category);
    return { message: "Xóa category thành công." };
  }

  private async findActiveOrThrow(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!category) {
      throw new BusinessException(
        "CATEGORY_NOT_FOUND",
        404,
        "Không tìm thấy category.",
      );
    }
    return category;
  }

  private async assertNameNotTaken(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.categoriesRepository.findOne({
      where: {
        name,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
    if (existing) {
      throw new BusinessException(
        "CATEGORY_NAME_DUPLICATE",
        409,
        "Tên category đã tồn tại.",
      );
    }
  }

  private toDto(category: Category): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      is_active: category.isActive,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    };
  }
}
