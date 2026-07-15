import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { useProductAlertsQuery } from "../api/products.queries";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: alerts } = useProductAlertsQuery(user?.branch_id ?? undefined);

  const lowStockCount = alerts?.low_stock.length ?? 0;
  const expiringCount = alerts?.expiring_soon.length ?? 0;
  const isAdmin = user?.role === "admin";

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>
          Xin chào, {user?.full_name}! 👋
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid-cols-4" style={{ marginBottom: "32px" }}>
        <div className="card" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))", borderColor: "rgba(99,102,241,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Vai trò</p>
              <h3 style={{ fontSize: "1.4rem" }}>{isAdmin ? "Admin" : "Nhân viên"}</h3>
            </div>
            <span style={{ fontSize: "1.8rem" }}>👤</span>
          </div>
        </div>

        <div className="card" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))", borderColor: "rgba(239,68,68,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Tồn kho thấp</p>
              <h3 style={{ fontSize: "1.8rem", color: lowStockCount > 0 ? "var(--danger)" : "var(--success)" }}>{lowStockCount}</h3>
            </div>
            <span style={{ fontSize: "1.8rem" }}>📦</span>
          </div>
          {lowStockCount > 0 && (
            <Link to="/products/alerts" style={{ fontSize: "0.8rem", color: "var(--danger)", textDecoration: "none", marginTop: "8px", display: "block" }}>
              Xem ngay →
            </Link>
          )}
        </div>

        <div className="card" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))", borderColor: "rgba(245,158,11,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Sắp hết hạn</p>
              <h3 style={{ fontSize: "1.8rem", color: expiringCount > 0 ? "var(--warning)" : "var(--success)" }}>{expiringCount}</h3>
            </div>
            <span style={{ fontSize: "1.8rem" }}>⏰</span>
          </div>
          {expiringCount > 0 && (
            <Link to="/products/alerts" style={{ fontSize: "0.8rem", color: "var(--warning)", textDecoration: "none", marginTop: "8px", display: "block" }}>
              Xem ngay →
            </Link>
          )}
        </div>

        <div className="card" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))", borderColor: "rgba(16,185,129,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px" }}>Chi nhánh</p>
              <h3 style={{ fontSize: "1.2rem" }}>{user?.branch_id ? `ID: ${user.branch_id}` : "Tất cả"}</h3>
            </div>
            <span style={{ fontSize: "1.8rem" }}>🏪</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>Truy cập nhanh</h2>
        <div className="grid-cols-3" style={{ gap: "16px" }}>
          <Link to="/pos" style={{ textDecoration: "none" }}>
            <div className="card" style={{ textAlign: "center", cursor: "pointer", borderColor: "rgba(99,102,241,0.2)", transition: "all 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)")}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🛒</div>
              <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>Bán hàng (POS)</h3>
              <p style={{ fontSize: "0.85rem" }}>Tạo đơn hàng và thanh toán</p>
            </div>
          </Link>

          <Link to="/shifts" style={{ textDecoration: "none" }}>
            <div className="card" style={{ textAlign: "center", cursor: "pointer", borderColor: "rgba(16,185,129,0.2)", transition: "all 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--success)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.2)")}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⏱️</div>
              <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>Quản lý Ca</h3>
              <p style={{ fontSize: "0.85rem" }}>Mở / đóng ca làm việc</p>
            </div>
          </Link>

          <Link to="/products" style={{ textDecoration: "none" }}>
            <div className="card" style={{ textAlign: "center", cursor: "pointer", borderColor: "rgba(245,158,11,0.2)", transition: "all 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--warning)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)")}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📋</div>
              <h3 style={{ fontSize: "1rem", marginBottom: "4px" }}>Sản phẩm</h3>
              <p style={{ fontSize: "0.85rem" }}>Xem và quản lý hàng hóa</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Alert summary if any */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="card" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "1.5rem" }}>🚨</span>
            <h3>Cảnh báo cần xử lý</h3>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {lowStockCount > 0 && (
              <span className="badge badge-danger" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                {lowStockCount} sản phẩm tồn kho thấp
              </span>
            )}
            {expiringCount > 0 && (
              <span className="badge badge-warning" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                {expiringCount} sản phẩm sắp hết / đã hết hạn
              </span>
            )}
          </div>
          <Link to="/products/alerts" className="btn btn-danger" style={{ marginTop: "16px", display: "inline-flex", textDecoration: "none" }}>
            Xem chi tiết cảnh báo →
          </Link>
        </div>
      )}
    </div>
  );
}
