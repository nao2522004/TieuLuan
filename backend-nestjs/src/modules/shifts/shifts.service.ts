import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Shift } from "./entities/shift.entity";
import { Order } from "../orders/entities/order.entity";
import { OpenShiftDto } from "./dto/open-shift.dto";
import { CloseShiftDto } from "./dto/close-shift.dto";
import { QueryShiftDto } from "./dto/query-shift.dto";
import {
  ShiftDataDto,
  ShiftDetailDataDto,
  ShiftOrderSummaryDto,
} from "./dto/shift-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { PaginationMeta } from "../../common/dto/api-response.dto";
import { BranchesService } from "../branches/branches.service";
import { UsersService } from "../users/users.service";
import { AuthUser } from "../../common/guards/jwt-auth.guard";

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftsRepository: Repository<Shift>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly branchesService: BranchesService,
    private readonly usersService: UsersService,
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
    const branch = await this.branchesService.findOne(branchId);

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

    return this.toDto(saved, branch.name, user.fullName);
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

    const userFullName =
      shift.userId === user.id
        ? user.fullName
        : (await this.usersService.findNamesByIds([shift.userId])).get(
            shift.userId,
          );
    const branchName = (
      await this.branchesService.findNamesByIds([shift.branchId])
    ).get(shift.branchId);

    return this.toDto(saved, branchName, userFullName);
  }

  async findAll(
    query: QueryShiftDto,
    user: AuthUser,
  ): Promise<{ data: ShiftDataDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.shiftsRepository.createQueryBuilder("s");

    if (user.role !== "admin") {
      if (user.branchId) {
        qb.andWhere("s.branch_id = :userBranchId", {
          userBranchId: user.branchId,
        });
      } else {
        qb.andWhere("s.user_id = :userId", { userId: user.id });
      }
    } else if (query.branch_id) {
      qb.andWhere("s.branch_id = :branchId", { branchId: query.branch_id });
    }

    if (query.user_id) {
      qb.andWhere("s.user_id = :userId", { userId: query.user_id });
    }

    if (query.status === "open") {
      qb.andWhere("s.closed_at IS NULL");
    } else if (query.status === "closed") {
      qb.andWhere("s.closed_at IS NOT NULL");
    }

    qb.orderBy("s.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    // Batch lookup tên - tránh N+1 query khi list nhiều ca
    const { branchNames, userNames } = await this.loadNames(
      rows.map((r) => r.branchId),
      rows.map((r) => r.userId),
    );

    const data = rows.map((s) =>
      this.toDto(s, branchNames.get(s.branchId), userNames.get(s.userId)),
    );

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

  async findOneDetail(id: number, user: AuthUser): Promise<ShiftDetailDataDto> {
    const shift = await this.findOrThrow(id);

    if (user.role !== "admin") {
      if (user.branchId) {
        if (shift.branchId !== user.branchId) {
          throw new BusinessException(
            "FORBIDDEN",
            403,
            "Bạn không có quyền xem ca làm việc của chi nhánh khác.",
          );
        }
      } else if (shift.userId !== user.id) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền xem ca làm việc này.",
        );
      }
    }

    const orders = await this.ordersRepository.find({
      where: { shiftId: id, deletedAt: IsNull() },
      order: { id: "ASC" },
    });

    let ordersCount = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let transferTotal = 0;

    for (const o of orders) {
      if (o.status !== "completed") continue;
      ordersCount += 1;
      const amount = Number(o.totalAmount);
      if (o.paymentMethod === "cash") cashTotal += amount;
      else if (o.paymentMethod === "card") cardTotal += amount;
      else if (o.paymentMethod === "transfer") transferTotal += amount;
    }

    const orderSummaries: ShiftOrderSummaryDto[] = orders.map((o) => ({
      id: o.id,
      payment_method: o.paymentMethod,
      payment_status: o.paymentStatus,
      status: o.status,
      total_amount: Number(o.totalAmount),
      created_at: o.createdAt,
    }));

    const { branchNames, userNames } = await this.loadNames(
      [shift.branchId],
      [shift.userId],
    );

    return {
      ...this.toDto(
        shift,
        branchNames.get(shift.branchId),
        userNames.get(shift.userId),
      ),
      orders_count: ordersCount,
      cash_orders_total: cashTotal,
      card_orders_total: cardTotal,
      transfer_orders_total: transferTotal,
      orders: orderSummaries,
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

  /**
   * Batch lookup branch_name / user_full_name cho 1 lô shift, tránh N+1
   * query khi trả list. Dùng chung cho findAll() và findOneDetail().
   */
  private async loadNames(
    branchIds: number[],
    userIds: number[],
  ): Promise<{
    branchNames: Map<number, string>;
    userNames: Map<number, string>;
  }> {
    const [branchNames, userNames] = await Promise.all([
      this.branchesService.findNamesByIds(branchIds),
      this.usersService.findNamesByIds(userIds),
    ]);
    return { branchNames, userNames };
  }

  private toDto(
    shift: Shift,
    branchName?: string,
    userFullName?: string,
  ): ShiftDataDto {
    const closingCash =
      shift.closingCash != null ? Number(shift.closingCash) : null;
    const expectedCash =
      shift.expectedCash != null ? Number(shift.expectedCash) : null;

    return {
      id: shift.id,
      branch_id: shift.branchId,
      branch_name: branchName ?? null,
      user_id: shift.userId,
      user_full_name: userFullName ?? null,
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
