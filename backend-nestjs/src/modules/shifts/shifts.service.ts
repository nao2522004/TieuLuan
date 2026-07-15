import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Shift } from "./entities/shift.entity";
import { Order } from "../orders/entities/order.entity";
import { OpenShiftDto } from "./dto/open-shift.dto";
import { CloseShiftDto } from "./dto/close-shift.dto";
import { QueryShiftDto } from "./dto/query-shift.dto";
import { ShiftDataDto } from "./dto/shift-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";
import { BranchesService } from "../branches/branches.service";
import { AuthUser } from "../../common/guards/jwt-auth.guard";

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftsRepository: Repository<Shift>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly branchesService: BranchesService,
  ) {}

  async open(dto: OpenShiftDto, user: AuthUser): Promise<ShiftDataDto> {
    const branchId = user.branchId ?? dto.branch_id;
    if (!branchId) {
      throw new BusinessException(
        "SHIFT_BRANCH_REQUIRED",
        400,
        "branch_id: bắt buộc khi tài khoản không gắn với 1 chi nhánh cụ thể",
      );
    }
    await this.branchesService.findOne(branchId);

    const existingOpen = await this.shiftsRepository.findOne({
      where: { userId: user.id, closedAt: IsNull() },
    });
    if (existingOpen) {
      throw this.alreadyOpenError();
    }

    const entity = this.shiftsRepository.create({
      branchId,
      userId: user.id,
      openingCash: dto.opening_cash,
      note: dto.note ?? null,
    });

    let saved: Shift;
    try {
      saved = await this.shiftsRepository.save(entity);
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw this.alreadyOpenError();
      }
      throw err;
    }

    return this.toDto(saved);
  }

  async close(
    id: number,
    dto: CloseShiftDto,
    user: AuthUser,
  ): Promise<ShiftDataDto> {
    const shift = await this.findOrThrow(id);

    if (shift.userId !== user.id && user.role !== "admin") {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Bạn không có quyền đóng ca làm việc này.",
      );
    }
    if (shift.closedAt) {
      throw new BusinessException(
        "SHIFT_ALREADY_CLOSED",
        409,
        "Ca làm việc này đã được đóng trước đó.",
      );
    }

    const cashRevenue = await this.ordersRepository
      .createQueryBuilder("o")
      .select("COALESCE(SUM(o.total_amount), 0)", "sum")
      .where("o.shift_id = :id", { id })
      .andWhere("o.payment_method = 'cash'")
      .andWhere("o.status = 'completed'")
      .andWhere("o.deleted_at IS NULL")
      .getRawOne<{ sum: string }>();

    const expectedCash =
      Number(shift.openingCash) + Number(cashRevenue?.sum ?? 0);

    shift.closingCash = dto.closing_cash;
    shift.expectedCash = expectedCash;
    shift.note = dto.note ?? shift.note;
    shift.closedAt = new Date();

    const saved = await this.shiftsRepository.save(shift);
    return this.toDto(saved);
  }

  async findAll(
    query: QueryShiftDto,
    user: AuthUser,
  ): Promise<{ data: ShiftDataDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.shiftsRepository.createQueryBuilder("s");

    // Phân quyền chi nhánh:
    // Staff chỉ được xem các ca của chi nhánh mình.
    // Admin xem được tất cả các chi nhánh, hoặc lọc theo query.branch_id nếu có.
    if (user.role !== "admin") {
      if (user.branchId) {
        qb.andWhere("s.branch_id = :userBranchId", { userBranchId: user.branchId });
      } else {
        // Staff không có branch_id thì chỉ xem được ca của chính mình
        qb.andWhere("s.user_id = :userId", { userId: user.id });
      }
    } else if (query.branch_id) {
      qb.andWhere("s.branch_id = :branchId", { branchId: query.branch_id });
    }

    // Bộ lọc theo nhân viên
    if (query.user_id) {
      qb.andWhere("s.user_id = :userId", { userId: query.user_id });
    }

    // Bộ lọc theo trạng thái ca: 'open' | 'closed'
    if (query.status === "open") {
      qb.andWhere("s.closed_at IS NULL");
    } else if (query.status === "closed") {
      qb.andWhere("s.closed_at IS NOT NULL");
    }

    qb.orderBy("s.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const data = rows.map((s) => this.toDto(s));

    return {
      data,
      meta: {
        current_page: page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOpenShiftForUser(userId: number): Promise<Shift | null> {
    return this.shiftsRepository.findOne({
      where: { userId, closedAt: IsNull() },
    });
  }

  private async findOrThrow(id: number): Promise<Shift> {
    const shift = await this.shiftsRepository.findOne({ where: { id } });
    if (!shift) {
      throw new BusinessException(
        "SHIFT_NOT_FOUND",
        404,
        "Không tìm thấy ca làm việc.",
      );
    }
    return shift;
  }

  private alreadyOpenError(): BusinessException {
    return new BusinessException(
      "SHIFT_ALREADY_OPEN",
      409,
      "Bạn đang có 1 ca làm việc chưa đóng, không thể mở ca mới.",
    );
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    );
  }

  private toDto(shift: Shift): ShiftDataDto {
    const closingCash =
      shift.closingCash != null ? Number(shift.closingCash) : null;
    const expectedCash =
      shift.expectedCash != null ? Number(shift.expectedCash) : null;

    return {
      id: shift.id,
      branch_id: shift.branchId,
      user_id: shift.userId,
      opening_cash: Number(shift.openingCash),
      closing_cash: closingCash,
      expected_cash: expectedCash,
      cash_difference:
        closingCash != null && expectedCash != null
          ? closingCash - expectedCash
          : null,
      note: shift.note,
      opened_at: shift.openedAt,
      closed_at: shift.closedAt,
    };
  }
}
