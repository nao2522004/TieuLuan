import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order } from "../orders/entities/order.entity";
import { Return } from "../returns/entities/return.entity";
import { QueryRevenueReportDto } from "./dto/query-revenue-report.dto";
import { RevenueReportDataDto } from "./dto/revenue-report-response.dto";
import { BusinessException } from "../../common/exceptions/business.exception";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Return)
    private readonly returnsRepository: Repository<Return>,
  ) {}

  async revenue(query: QueryRevenueReportDto): Promise<RevenueReportDataDto> {
    if (query.from_date && query.to_date && query.from_date > query.to_date) {
      throw new BusinessException(
        "VALIDATION_ERROR",
        400,
        "from_date: phải nhỏ hơn hoặc bằng to_date",
      );
    }

    const branchId = query.branch_id;

    const ordersQb = this.ordersRepository
      .createQueryBuilder("o")
      .select("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(o.total_amount), 0)", "sum")
      .where("o.status = 'completed'");

    if (branchId) {
      ordersQb.andWhere("o.branch_id = :branchId", { branchId });
    }
    if (query.from_date) {
      ordersQb.andWhere("o.created_at >= :fromDate", {
        fromDate: query.from_date,
      });
    }
    if (query.to_date) {
      ordersQb.andWhere("o.created_at < (:toDate::date + interval '1 day')", {
        toDate: query.to_date,
      });
    }

    const orderAgg = await ordersQb.getRawOne<{ count: string; sum: string }>();

    const returnsQb = this.returnsRepository
      .createQueryBuilder("r")
      .innerJoin("order_items", "oi", "oi.id = r.order_item_id")
      .innerJoin("orders", "o", "o.id = oi.order_id")
      .select("COALESCE(SUM(r.refund_amount), 0)", "sum")
      .where("o.status = 'completed'");

    if (branchId) {
      returnsQb.andWhere("o.branch_id = :branchId", { branchId });
    }
    if (query.from_date) {
      returnsQb.andWhere("o.created_at >= :fromDate", {
        fromDate: query.from_date,
      });
    }
    if (query.to_date) {
      returnsQb.andWhere("o.created_at < (:toDate::date + interval '1 day')", {
        toDate: query.to_date,
      });
    }

    const returnAgg = await returnsQb.getRawOne<{ sum: string }>();

    const grossRevenue = Number(orderAgg?.sum ?? 0);
    const totalRefund = Number(returnAgg?.sum ?? 0);

    return {
      from_date: query.from_date ?? null,
      to_date: query.to_date ?? null,
      branch_id: branchId ?? null,
      total_orders: Number(orderAgg?.count ?? 0),
      gross_revenue: grossRevenue,
      total_refund: totalRefund,
      net_revenue: grossRevenue - totalRefund,
    };
  }
}
