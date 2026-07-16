import { useState } from "react";
import { useAuth } from "@/features/auth";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { useShiftsQuery } from "../api/shifts.queries";
import { ShiftDetailModal } from "./ShiftDetailModal";
import { CloseShiftModal } from "./ShiftModals";
import type { Shift } from "../types";

export function AllShiftsTable() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [page, setPage] = useState(1);
  const limit = 10;
  const [branchFilter, setBranchFilter] = useState<number | undefined>(
    undefined,
  );
  const [userIdFilter, setUserIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "open" | "closed">("");
  const [detailShiftId, setDetailShiftId] = useState<number | null>(null);
  const [closingShift, setClosingShift] = useState<Shift | null>(null);

  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const { data: response, isLoading } = useShiftsQuery({
    page,
    limit,
    branch_id: isAdmin ? branchFilter : undefined,
    user_id: userIdFilter ? Number(userIdFilter) : undefined,
    status: statusFilter || undefined,
  });

  const shifts = response?.data || [];
  const meta = response?.meta;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>
          {isAdmin
            ? "📋 Toàn bộ ca làm việc (mọi chi nhánh)"
            : "📋 Lịch sử ca làm việc"}
        </h3>
        <div className="grid-cols-3" style={{ gap: 12 }}>
          {isAdmin && (
            <select
              className="form-control"
              value={branchFilter || ""}
              onChange={(e) => {
                setBranchFilter(
                  e.target.value ? Number(e.target.value) : undefined,
                );
                setPage(1);
              }}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {isAdmin && (
            <input
              type="number"
              className="form-control"
              placeholder="Lọc theo ID nhân viên..."
              value={userIdFilter}
              onChange={(e) => {
                setUserIdFilter(e.target.value);
                setPage(1);
              }}
            />
          )}
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "" | "open" | "closed");
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="open">Đang mở</option>
            <option value="closed">Đã đóng</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>Đang tải...</div>
      ) : shifts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--text-secondary)",
          }}
        >
          Không có ca làm việc nào.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Chi nhánh</th>
                <th>Nhân viên</th>
                <th>Quỹ đầu ca</th>
                <th>Trạng thái</th>
                <th>Mở lúc</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                    #{s.id}
                  </td>
                  <td>{s.branch_name ?? `#${s.branch_id}`}</td>
                  <td>{s.user_full_name ?? `#${s.user_id}`}</td>
                  <td>{s.opening_cash.toLocaleString("vi-VN")} đ</td>
                  <td>
                    {s.closed_at ? (
                      <span className="badge badge-info">Đã đóng</span>
                    ) : (
                      <span className="badge badge-success">Đang mở</span>
                    )}
                  </td>
                  <td
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {new Date(s.opened_at).toLocaleString("vi-VN")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="flex-row-end" style={{ gap: 8 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        onClick={() => setDetailShiftId(s.id)}
                      >
                        Xem
                      </button>
                      {isAdmin && !s.closed_at && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                          onClick={() => setClosingShift(s)}
                        >
                          Đóng hộ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.total_pages > 1 && (
        <div
          className="flex-row-between"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Trang {page} / {meta.total_pages} ({meta.total_items} ca)
          </span>
          <div className="flex-row-end" style={{ gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: "6px 12px", fontSize: "0.85rem" }}
            >
              Trước
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
              disabled={page === meta.total_pages}
              style={{ padding: "6px 12px", fontSize: "0.85rem" }}
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {detailShiftId && (
        <ShiftDetailModal
          shiftId={detailShiftId}
          onClose={() => setDetailShiftId(null)}
        />
      )}
      {closingShift && (
        <CloseShiftModal
          shift={closingShift}
          onClose={() => setClosingShift(null)}
        />
      )}
    </div>
  );
}
