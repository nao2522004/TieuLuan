import { useAuth } from "@/features/auth";
import { useProductAlertsQuery } from "../api/products.queries";

export default function ProductAlertsPage() {
  const { user } = useAuth();

  const { data: alerts, isLoading } = useProductAlertsQuery(user?.branch_id ?? undefined);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN");

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>⚠️ Cảnh báo Sản phẩm</h2>
          <p>Tồn kho thấp và sản phẩm sắp hết hạn / đã hết hạn sử dụng</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Đang tải cảnh báo...</div>
      ) : (
        <div className="grid-cols-2" style={{ gap: "24px" }}>
          {/* Low Stock Panel */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.5rem" }}>📦</span>
              <div>
                <h3 style={{ fontSize: "1rem", marginBottom: "2px" }}>Tồn kho thấp</h3>
                <p style={{ fontSize: "0.8rem", margin: 0 }}>{alerts?.low_stock.length ?? 0} sản phẩm dưới ngưỡng cảnh báo</p>
              </div>
            </div>
            {alerts?.low_stock.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✅</div>
                Tất cả sản phẩm đều đủ tồn kho
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tên sản phẩm</th>
                      <th>Tồn kho</th>
                      <th>Ngưỡng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts?.low_stock.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{p.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.barcode}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: "700", color: "var(--danger)", fontSize: "1.1rem" }}>{p.stock_quantity}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}> {p.unit}</span>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>{p.reorder_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expiring Soon Panel */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.5rem" }}>⏰</span>
              <div>
                <h3 style={{ fontSize: "1rem", marginBottom: "2px" }}>Sắp hết hạn / Đã hết hạn</h3>
                <p style={{ fontSize: "0.8rem", margin: 0 }}>{alerts?.expiring_soon.length ?? 0} sản phẩm cần chú ý</p>
              </div>
            </div>
            {alerts?.expiring_soon.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>✅</div>
                Không có sản phẩm nào sắp hết hạn
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tên sản phẩm</th>
                      <th>Hạn sử dụng</th>
                      <th>Tồn kho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts?.expiring_soon.map((p) => {
                      const isExpired = p.expiry_date ? new Date(p.expiry_date) < new Date() : false;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{p.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.barcode}</div>
                          </td>
                          <td>
                            <span className={`badge ${isExpired ? "badge-danger" : "badge-warning"}`}>
                              {p.expiry_date ? formatDate(p.expiry_date) : "—"}
                            </span>
                            {isExpired && <div style={{ fontSize: "0.7rem", color: "var(--danger)", marginTop: "4px" }}>Đã hết hạn!</div>}
                          </td>
                          <td>{p.stock_quantity} {p.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
