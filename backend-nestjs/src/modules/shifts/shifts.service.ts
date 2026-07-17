import { Injectable } from "@nestjs/common";
import { IsNull, Repository, DataSource } from "typeorm";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Shift } from "./entities/shift.entity";
import { ShiftUser } from "./entities/shift-user.entity";
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
    @InjectRepository(ShiftUser)
    private readonly shiftUsersRepository: Repository<ShiftUser>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly branchesService: BranchesService,
    private readonly usersService: UsersService,
  ) {}

  async open(dto: OpenShiftDto, user: AuthUser): Promise<ShiftDataDto> {
    if (user.role !== "admin" && user.role !== "leader") {
      throw new BusinessException(
        "FORBIDDEN",
        403,
        "Chỉ Trưởng ca hoặc Quản trị viên mới được quyền mở ca làm việc.",
      );
    }

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
      where: { branchId, closedAt: IsNull() },
    });
    if (existingOpen) {
      throw this.alreadyOpenError();
    }

    // Check duplicate cashiers (chỉ khi có danh sách thu ngân)
    const cashierIds = dto.cashier_ids ?? [];
    const uniqueIds = [...new Set(cashierIds)];
    if (uniqueIds.length !== cashierIds.length) {
      throw new BusinessException(
        "SHIFT_CASHIERS_DUPLICATE",
        400,
        "Danh sách ID thu ngân không được trùng lặp.",
      );
    }

    // Validate cashiers (chỉ khi có danh sách)
    let cashiers: Awaited<ReturnType<typeof this.usersService.findByIds>> = [];
    if (uniqueIds.length > 0) {
      cashiers = await this.usersService.findByIds(uniqueIds);
      if (cashiers.length !== uniqueIds.length) {
        throw new BusinessException(
          "SHIFT_CASHIERS_INVALID",
          400,
          "Một hoặc nhiều thu ngân không tồn tại trong hệ thống.",
        );
      }

      for (const cashier of cashiers) {
        if (!cashier.isActive) {
          throw new BusinessException(
            "SHIFT_CASHIER_INACTIVE",
            400,
            `Thu ngân "${cashier.fullName}" hiện đã bị khóa tài khoản.`,
          );
        }
        if (cashier.role.code !== "cashier") {
          throw new BusinessException(
            "SHIFT_CASHIER_ROLE_INVALID",
            400,
            `Người dùng "${cashier.fullName}" không phải là thu ngân.`,
          );
        }
        if (cashier.branchId !== branchId) {
          throw new BusinessException(
            "SHIFT_CASHIER_BRANCH_INVALID",
            400,
            `Thu ngân "${cashier.fullName}" thuộc chi nhánh khác.`,
          );
        }
      }
    }

    const entity = this.shiftsRepository.create({
      branchId,
      userId: user.id,
      openingCash: dto.opening_cash,
      note: dto.note ?? null,
    });

    const shiftUsers = cashiers.map((c) => {
      const su = new ShiftUser();
      su.userId = c.id;
      su.shift = entity;
      return su;
    });
    entity.shiftUsers = shiftUsers;

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
    const saved = await this.dataSource.transaction(async (manager) => {
      const shiftRepo = manager.getRepository(Shift);

      const shift = await shiftRepo
        .createQueryBuilder("s")
        .setLock("pessimistic_write")
        .where("s.id = :id", { id })
        .getOne();

      if (!shift) {
        throw new BusinessException(
          "SHIFT_NOT_FOUND",
          404,
          "Không tìm thấy ca làm việc.",
        );
      }
      if (user.role !== "admin" && shift.userId !== user.id) {
        throw new BusinessException(
          "FORBIDDEN",
          403,
          "Bạn không có quyền đóng ca làm việc này (chỉ Trưởng ca đã mở ca hoặc Admin mới được phép đóng).",
        );
      }
      if (shift.closedAt) {
        throw new BusinessException(
          "SHIFT_ALREADY_CLOSED",
          409,
          "Ca làm việc này đã được đóng trước đó.",
        );
      }

      const cashRevenue = await manager
        .getRepository(Order)
        .createQueryBuilder("o")
        .select("COALESCE(SUM(o.total_amount), 0)", "sum")
        .where("o.shift_id = :id", { id })
        .andWhere("o.payment_method = 'cash'")
        .andWhere("o.status = 'completed'")
        .andWhere("o.deleted_at IS NULL")
        .getRawOne<{ sum: string }>();

      shift.closingCash = dto.closing_cash;
      shift.expectedCash =
        Number(shift.openingCash) + Number(cashRevenue?.sum ?? 0);
      shift.note = dto.note ?? shift.note;
      shift.closedAt = new Date();

      return shiftRepo.save(shift);
    });

    const shiftWithUsers = await this.shiftsRepository.findOne({
      where: { id: saved.id },
      relations: ["shiftUsers", "shiftUsers.user"],
    });

    const userFullName =
      saved.userId === user.id
        ? user.fullName
        : (await this.usersService.findNamesByIds([saved.userId])).get(
            saved.userId,
          );
    const branchName = (
      await this.branchesService.findNamesByIds([saved.branchId])
    ).get(saved.branchId);

    return this.toDto(shiftWithUsers ?? saved, branchName, userFullName);
  }

  async findAll(
    query: QueryShiftDto,
    user: AuthUser,
  ): Promise<{ data: ShiftDataDto[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.shiftsRepository
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.shiftUsers", "su")
      .leftJoinAndSelect("su.user", "u");

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

    // Batch lookup tên nhân viên tạo từng đơn — tránh N+1 khi ca có nhiều đơn
    const creatorNames = await this.usersService.findNamesByIds(
      orders.map((o) => o.createdBy),
    );

    const orderSummaries: ShiftOrderSummaryDto[] = orders.map((o) => ({
      id: o.id,
      created_by: o.createdBy,
      created_by_name: creatorNames.get(o.createdBy) ?? null,
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
  async findOpenShiftForBranch(branchId: number): Promise<Shift | null> {
    return this.shiftsRepository.findOne({
      where: { branchId, closedAt: IsNull() },
      relations: ["shiftUsers", "shiftUsers.user"],
    });
  }

  async isUserInShift(userId: number, shiftId: number): Promise<boolean> {
    const count = await this.shiftUsersRepository.count({
      where: { shiftId, userId },
    });
    return count > 0;
  }

  private async findOrThrow(id: number): Promise<Shift> {
    const shift = await this.shiftsRepository.findOne({
      where: { id },
      relations: ["shiftUsers", "shiftUsers.user"],
    });
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
      "Chi nhánh đang có 1 ca làm việc chưa đóng, không thể mở ca mới.",
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

    const cashiersList =
      shift.shiftUsers?.map((su) => ({
        id: su.userId,
        full_name: su.user ? su.user.fullName : `Thu ngân #${su.userId}`,
      })) || [];

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
      cashiers: cashiersList,
    };
  }
}
