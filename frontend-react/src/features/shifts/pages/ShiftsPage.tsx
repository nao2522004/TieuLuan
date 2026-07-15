import { useState } from "react";
import { useShiftStore } from "../stores/shift.store";
import { OpenShiftModal, CloseShiftModal } from "../components/ShiftModals";

export default function ShiftsPage() {
  const { activeShift } = useShiftStore();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const formatMoney = (v: number | null) =>
    v != null ? v.toLocaleString("vi-VN") + " đ" : "—";

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>⏱️ Quản lý Ca làm việc</h2>
          <p>Mở và đóng ca, theo dõi quỹ tiền mặt đầu/cuối ca</p>
        </div>
        <div className="flex-row-end" style={{ gap: "12px" }}>
          {activeShift ? (
            <button className="btn btn-danger" onClick={() => setShowCloseModal(true)}>
              🔒 Đóng ca hiện tại
            </button>
          ) : (
            <button className="btn btn-success" onClick={() => setShowOpenModal(true)}>
              ✅ Mở ca mới
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <div className="card" style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <span style={{ fontSize: "2rem" }}>✅</span>
            <div>
              <h3>Ca đang mở – ID #{activeShift.id}</h3>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Bắt đầu lúc: {new Date(activeShift.opened_at).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
          <div className="grid-cols-2" style={{ gap: "16px" }}>
            <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Quỹ đầu ca</p>
              <h3 style={{ fontSize: "1.4rem", color: "var(--success)" }}>{formatMoney(activeShift.opening_cash)}</h3>
            </div>
            {activeShift.note && (
              <div style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Ghi chú</p>
                <p style={{ margin: 0 }}>{activeShift.note}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "48px", borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
          <h3 style={{ marginBottom: "8px" }}>Chưa có ca làm việc nào đang mở</h3>
          <p>Nhấn nút <strong>Mở ca mới</strong> để bắt đầu ca làm việc trước khi bán hàng.</p>
          <button className="btn btn-success" style={{ marginTop: "16px" }} onClick={() => setShowOpenModal(true)}>
            ✅ Mở ca mới ngay
          </button>
        </div>
      )}

      {/* Modals */}
      {showOpenModal && <OpenShiftModal onClose={() => setShowOpenModal(false)} />}
      {showCloseModal && <CloseShiftModal onClose={() => setShowCloseModal(false)} />}
    </div>
  );
}
