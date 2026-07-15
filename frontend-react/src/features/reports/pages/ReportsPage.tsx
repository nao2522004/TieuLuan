import { useState } from "react";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { useRevenueQuery } from "../api/reports.queries";

export default function ReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  const [branchFilter, setBranchFilter] = useState<number | undefined>(undefined);

  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const { data: revenue, isLoading, refetch } = useRevenueQuery({
    from_date: fromDate,
    to_date: toDate,
    branch_id: branchFilter,
  });

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>📊 Báo cáo Doanh thu</h2>
          <p>Thống kê doanh thu, hoàn trả và tổng hợp theo khoảng thời gian</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--text-secondary)" }}>Bộ lọc báo cáo</h3>
        <div className="grid-cols-3" style={{ gap: "16px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Từ ngày</label>
            <input
              type="date"
              className="form-control"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Đến ngày</label>
            <input
              type="date"
              className="form-control"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ marginBottom: "4px" }}>Chi nhánh</label>
            <select
              className="form-control"
              value={branchFilter || ""}
              onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Toàn hệ thống</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <button className="btn btn-primary" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? "⏳ Đang tải..." : "🔄 Tải báo cáo"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {revenue && (
        <>
          <div className="grid-cols-4" style={{ marginBottom: "24px" }}>
            <div className="card" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.04))", borderColor: "rgba(99,102,241,0.25)" }}>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Tổng đơn hàng</p>
              <h2 style={{ fontSize: "2.2rem", color: "var(--primary)" }}>{revenue.total_orders.toLocaleString("vi-VN")}</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>đơn hoàn thành</p>
            </div>

            <div className="card" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.04))", borderColor: "rgba(16,185,129,0.25)" }}>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Doanh thu gộp</p>
              <h2 style={{ fontSize: "1.6rem", color: "var(--success)" }}>
                {revenue.gross_revenue.toLocaleString("vi-VN")}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>VND</p>
            </div>

            <div className="card" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))", borderColor: "rgba(239,68,68,0.25)" }}>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Tổng hoàn trả</p>
              <h2 style={{ fontSize: "1.6rem", color: "var(--danger)" }}>
                {revenue.total_refund.toLocaleString("vi-VN")}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>VND</p>
            </div>

            <div className="card" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))", borderColor: "rgba(245,158,11,0.25)" }}>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Doanh thu thuần</p>
              <h2 style={{ fontSize: "1.6rem", color: "var(--warning)" }}>
                {revenue.net_revenue.toLocaleString("vi-VN")}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>VND</p>
            </div>
          </div>

          {/* Summary table */}
          <div className="card">
            <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>Chi tiết báo cáo</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th>
                    <th style={{ textAlign: "right" }}>Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Khoảng thời gian</td>
                    <td style={{ textAlign: "right" }}>
                      {revenue.from_date || "Không giới hạn"} → {revenue.to_date || "Không giới hạn"}
                    </td>
                  </tr>
                  <tr>
                    <td>Chi nhánh</td>
                    <td style={{ textAlign: "right" }}>
                      {revenue.branch_id
                        ? branches.find((b) => b.id === revenue.branch_id)?.name || `ID: ${revenue.branch_id}`
                        : "Toàn hệ thống"}
                    </td>
                  </tr>
                  <tr>
                    <td>Tổng số đơn hàng hoàn thành</td>
                    <td style={{ textAlign: "right", fontWeight: "600" }}>{revenue.total_orders}</td>
                  </tr>
                  <tr>
                    <td>Doanh thu gộp</td>
                    <td style={{ textAlign: "right", fontWeight: "600", color: "var(--success)" }}>
                      {revenue.gross_revenue.toLocaleString("vi-VN")} đ
                    </td>
                  </tr>
                  <tr>
                    <td>Tổng tiền hoàn trả</td>
                    <td style={{ textAlign: "right", fontWeight: "600", color: "var(--danger)" }}>
                      − {revenue.total_refund.toLocaleString("vi-VN")} đ
                    </td>
                  </tr>
                  <tr style={{ borderTop: "2px solid var(--border-color-hover)" }}>
                    <td style={{ fontWeight: "700", fontSize: "1.05rem" }}>Doanh thu thuần</td>
                    <td style={{ textAlign: "right", fontWeight: "800", fontSize: "1.1rem", color: "var(--primary)" }}>
                      {revenue.net_revenue.toLocaleString("vi-VN")} đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          Đang tải báo cáo doanh thu...
        </div>
      )}
    </div>
  );
}
