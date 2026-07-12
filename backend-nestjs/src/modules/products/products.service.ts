import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, IsNull, Not, Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { Branch } from "../branches/entities/branch.entity";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductDto } from "./dto/query-product.dto";
import { ProductDto } from "./dto/product-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";
import { CategoriesService } from "../categories/categories.service";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Branch)
    private readonly branchesRepository: Repository<Branch>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAll(
    query: QueryProductDto,
  ): Promise<{ data: ProductDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [rows, total] = await this.productsRepository.findAndCount({
      where: {
        deletedAt: IsNull(),
        ...(query.branch_id ? { branchId: query.branch_id } : {}),
        ...(query.category_id ? { categoryId: query.category_id } : {}),
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

  async findOne(id: number): Promise<ProductDto> {
    const product = await this.findActiveOrThrow(id);
    return this.toDto(product);
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    await this.assertBranchExists(dto.branch_id);
    await this.categoriesService.findOne(dto.category_id); // throws CATEGORY_NOT_FOUND nếu không có
    await this.assertBarcodeNotTaken(dto.branch_id, dto.barcode);

    const entity = this.productsRepository.create({
      branchId: dto.branch_id,
      categoryId: dto.category_id,
      barcode: dto.barcode,
      name: dto.name,
      unit: dto.unit,
      costPrice: dto.cost_price,
      salePrice: dto.sale_price,
      stockQuantity: dto.stock_quantity ?? 0,
      reorderLevel: dto.reorder_level ?? 10,
      expiryDate: dto.expiry_date ?? null,
    });
    const saved = await this.productsRepository.save(entity);
    return this.toDto(saved);
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductDto> {
    const product = await this.findActiveOrThrow(id);

    const effectiveBranchId = dto.branch_id ?? product.branchId;
    const effectiveBarcode = dto.barcode ?? product.barcode;

    if (dto.branch_id !== undefined && dto.branch_id !== product.branchId) {
      await this.assertBranchExists(dto.branch_id);
    }
    if (
      dto.category_id !== undefined &&
      dto.category_id !== product.categoryId
    ) {
      await this.categoriesService.findOne(dto.category_id);
    }
    if (dto.branch_id !== undefined || dto.barcode !== undefined) {
      await this.assertBarcodeNotTaken(effectiveBranchId, effectiveBarcode, id);
    }

    if (dto.branch_id !== undefined) product.branchId = dto.branch_id;
    if (dto.category_id !== undefined) product.categoryId = dto.category_id;
    if (dto.barcode !== undefined) product.barcode = dto.barcode;
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.unit !== undefined) product.unit = dto.unit;
    if (dto.cost_price !== undefined) product.costPrice = dto.cost_price;
    if (dto.sale_price !== undefined) product.salePrice = dto.sale_price;
    if (dto.stock_quantity !== undefined)
      product.stockQuantity = dto.stock_quantity;
    if (dto.reorder_level !== undefined)
      product.reorderLevel = dto.reorder_level;
    if (dto.expiry_date !== undefined) product.expiryDate = dto.expiry_date;

    const saved = await this.productsRepository.save(product);
    return this.toDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findActiveOrThrow(id);
    product.deletedAt = new Date();
    await this.productsRepository.save(product);
    return { message: "Xóa sản phẩm thành công." };
  }

  private async findActiveOrThrow(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!product) {
      throw new BusinessException(
        "PRODUCT_NOT_FOUND",
        404,
        "Không tìm thấy sản phẩm.",
      );
    }
    return product;
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

  private async assertBarcodeNotTaken(
    branchId: number,
    barcode: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.productsRepository.findOne({
      where: {
        branchId,
        barcode,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
    if (existing) {
      throw new BusinessException(
        "PRODUCT_BARCODE_DUPLICATE",
        409,
        "Barcode đã tồn tại trong chi nhánh này.",
      );
    }
  }

  private toDto(product: Product): ProductDto {
    return {
      id: product.id,
      branch_id: product.branchId,
      category_id: product.categoryId,
      barcode: product.barcode,
      name: product.name,
      unit: product.unit,
      cost_price: product.costPrice,
      sale_price: product.salePrice,
      stock_quantity: product.stockQuantity,
      reorder_level: product.reorderLevel,
      expiry_date: product.expiryDate,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }
}
