from datetime import date, timedelta
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessException
from app.modules.reports.crud import ReportCRUD
from app.modules.reports.schemas import QueryRevenueReportDto


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crud = ReportCRUD(db)

    async def revenue(self, query: QueryRevenueReportDto) -> Dict[str, Any]:
        if query.from_date and query.to_date and query.from_date > query.to_date:
            raise BusinessException(
                "VALIDATION_ERROR",
                400,
                "from_date: phải nhỏ hơn hoặc bằng to_date",
            )

        from_date_obj = date.fromisoformat(query.from_date) if query.from_date else None
        to_date_exclusive = (
            date.fromisoformat(query.to_date) + timedelta(days=1)
            if query.to_date
            else None
        )

        total_orders, gross_revenue = await self.crud.get_orders_aggregate(
            query.branch_id, from_date_obj, to_date_exclusive
        )
        total_refund = await self.crud.get_returns_aggregate(
            query.branch_id, from_date_obj, to_date_exclusive
        )

        return {
            "from_date": query.from_date,
            "to_date": query.to_date,
            "branch_id": query.branch_id,
            "total_orders": total_orders,
            "gross_revenue": gross_revenue,
            "total_refund": total_refund,
            "net_revenue": gross_revenue - total_refund,
        }
