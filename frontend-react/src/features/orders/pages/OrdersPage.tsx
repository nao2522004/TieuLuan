import { useState } from "react";
import { useAuth } from "@/features/auth";
import {
  useOrdersQuery,
  useCancelOrderMutation,
  useConfirmPaymentMutation,
} from "../api/orders.queries";
import type { Order } from "../types";
import { useOrderDetailQuery } from "../api/orders.queries";
import { ReceiptPrintView } from "../components/ReceiptPrintView";
import { useBranchDetailQuery } from "@/features/branches/api/branches.queries";

function StatusBadge({ status }: { status: string }) {
  return status === "completed" ? (
    <span className="badge badge-success">Hoàn thành</span>
  ) : (
    <span className="badge badge-danger">Đã hủy</span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  return status === "paid" ? (
    <span className="badge badge-success">Đã thanh toán</span>
  ) : (
    <span className="badge badge-warning">Chờ xác nhận</span>
  );
}

function MethodIcon({ method }: { method: string }) {
  if (method === "cash")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "1.1rem" }}
        >
          payments
        </span>{" "}
        Tiền mặt
      </span>
    );
  if (method === "card")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "1.1rem" }}
        >
          credit_card
        </span>{" "}
        Thẻ
      </span>
    );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "1.1rem" }}
      >
        qr_code_2
      </span>{" "}
      ZaloPay
    </span>
  );
}

function OrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: number;
  onClose: () => void;
}) {
  const { data: order, isLoading } = useOrderDetailQuery(orderId);
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin");
  const cancelMutation = useCancelOrderMutation();
  const confirmMutation = useConfirmPaymentMutation();
  const { data: branchDetail } = useBranchDetailQuery(order?.branch_id);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box animate-slide-in"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-title-bar"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: "var(--primary)" }}
          >
            receipt_long
          </span>
          <h3 style={{ margin: 0 }}>Chi tiết Đơn #{orderId}</h3>
          <button
            className="btn btn-secondary"
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              fontSize: "0.8rem",
            }}
            onClick={onClose}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "1rem" }}
            >
              close
            </span>
          </button>
        </div>

        <div className="modal-content">
          {isLoading || !order ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px",
                color: "var(--text-muted)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "2rem" }}
              >
                hourglass_empty
              </span>
              <p>Đang tải...</p>
            </div>
          ) : (
            <>
              {/* Thông tin tổng quan */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: 16,
                  padding: 16,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  fontSize: "0.875rem",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Mã đơn</span>
                  <div style={{ fontWeight: 700, color: "var(--primary)" }}>
                    #{order.id}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Thời gian tạo
                  </span>
                  <div>
                    {new Date(order.created_at).toLocaleString("vi-VN")}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Chi nhánh
                  </span>
                  <div>#{order.branch_id}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Nhân viên tạo
                  </span>
                  <div>#{order.created_by}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Phương thức
                  </span>
                  <div>
                    <MethodIcon method={order.payment_method} />
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Trạng thái TT
                  </span>
                  <div>
                    <PaymentStatusBadge status={order.payment_status} />
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Trạng thái đơn
                  </span>
                  <div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Ca làm việc
                  </span>
                  <div>{order.shift_id ? `#${order.shift_id}` : "—"}</div>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <h4
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                🛍️ Sản phẩm trong đơn ({order.items.length} dòng)
              </h4>
              <div
                className="table-container"
                style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid var(--border-color)",
                  marginBottom: 16,
                }}
              >
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th style={{ textAlign: "center" }}>SL</th>
                      <th style={{ textAlign: "right" }}>Đơn giá</th>
                      <th style={{ textAlign: "right" }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            {item.product_name ??
                              `Sản phẩm #${item.product_id}`}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            ID: #{item.product_id}
                          </div>
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                          {item.quantity}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.9rem" }}>
                          {item.unit_price.toLocaleString("vi-VN")} đ
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "var(--primary)",
                          }}
                        >
                          {(item.unit_price * item.quantity).toLocaleString(
                            "vi-VN",
                          )}{" "}
                          đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tổng tiền */}
              <div
                style={{
                  padding: 14,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  marginBottom: 12,
                }}
              >
                {order.discount_amount > 0 && (
                  <div
                    className="flex-row-between"
                    style={{
                      marginBottom: 8,
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Giảm giá:</span>
                    <span>
                      − {order.discount_amount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                )}
                <div className="flex-row-between">
                  <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                    Tổng thanh toán:
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "1.25rem",
                      color: "var(--primary)",
                    }}
                  >
                    {order.total_amount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              {/* Hành động */}
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  className="btn btn-secondary no-print"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={handlePrint}
                >
                  <span className="material-symbols-outlined">print</span>
                  In hóa đơn
                </button>

                {order.payment_status === "pending" &&
                  order.status !== "cancelled" && (
                    <button
                      className="btn btn-success"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onClick={() =>
                        confirmMutation.mutate(order.id, { onSuccess: onClose })
                      }
                      disabled={confirmMutation.isPending}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "1rem" }}
                      >
                        done
                      </span>
                      {confirmMutation.isPending
                        ? "Đang xử lý..."
                        : "Xác nhận thanh toán"}
                    </button>
                  )}
                {order.status !== "cancelled" &&
                  (isAdmin || order.created_by === user?.id) && (
                    <button
                      className="btn btn-danger"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onClick={() => {
                        if (
                          window.confirm("Bạn có chắc muốn hủy đơn hàng này?")
                        ) {
                          cancelMutation.mutate(order.id, {
                            onSuccess: onClose,
                          });
                        }
                      }}
                      disabled={cancelMutation.isPending}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "1rem" }}
                      >
                        close
                      </span>
                      {cancelMutation.isPending ? "Đang hủy..." : "Hủy đơn"}
                    </button>
                  )}
              </div>
              {order && (
                <ReceiptPrintView
                  order={order}
                  branchName={branchDetail?.name}
                  branchAddress={branchDetail?.address}
                  branchPhone={branchDetail?.phone}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterState {
  status: "" | "completed" | "cancelled";
  payment_status: "" | "paid" | "pending";
  from_date: string;
  to_date: string;
  created_by: string;
}

function FilterBar({
  filters,
  onChange,
  onReset,
  isAdmin,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onReset: () => void;
  isAdmin: boolean;
}) {
  const hasFilter =
    filters.status ||
    filters.payment_status ||
    filters.from_date ||
    filters.to_date ||
    filters.created_by;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        alignItems: "flex-end",
      }}
    >
      {/* From date */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 140,
        }}
      >
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          Từ ngày
        </label>
        <input
          type="date"
          className="form-control"
          style={{ padding: "6px 10px", fontSize: "0.85rem" }}
          value={filters.from_date}
          onChange={(e) => onChange({ ...filters, from_date: e.target.value })}
        />
      </div>

      {/* To date */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 140,
        }}
      >
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          Đến ngày
        </label>
        <input
          type="date"
          className="form-control"
          style={{ padding: "6px 10px", fontSize: "0.85rem" }}
          value={filters.to_date}
          onChange={(e) => onChange({ ...filters, to_date: e.target.value })}
        />
      </div>

      {/* Status */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 140,
        }}
      >
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          Trạng thái đơn
        </label>
        <select
          className="form-control"
          style={{ padding: "6px 10px", fontSize: "0.85rem" }}
          value={filters.status}
          onChange={(e) =>
            onChange({
              ...filters,
              status: e.target.value as FilterState["status"],
            })
          }
        >
          <option value="">Tất cả</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {/* Payment status */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 150,
        }}
      >
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          Thanh toán
        </label>
        <select
          className="form-control"
          style={{ padding: "6px 10px", fontSize: "0.85rem" }}
          value={filters.payment_status}
          onChange={(e) =>
            onChange({
              ...filters,
              payment_status: e.target.value as FilterState["payment_status"],
            })
          }
        >
          <option value="">Tất cả</option>
          <option value="paid">Đã thanh toán</option>
          <option value="pending">Chờ xác nhận</option>
        </select>
      </div>

      {/* Created by (Admin only) */}
      {isAdmin && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 130,
          }}
        >
          <label
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Nhân viên (ID)
          </label>
          <input
            type="number"
            className="form-control"
            style={{ padding: "6px 10px", fontSize: "0.85rem" }}
            placeholder="VD: 2"
            min={1}
            value={filters.created_by}
            onChange={(e) =>
              onChange({ ...filters, created_by: e.target.value })
            }
          />
        </div>
      )}

      {/* Reset */}
      {hasFilter && (
        <button
          className="btn btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "7px 14px",
            fontSize: "0.85rem",
            alignSelf: "flex-end",
          }}
          onClick={onReset}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "1rem" }}
          >
            filter_list_off
          </span>
          Xóa lọc
        </button>
      )}
    </div>
  );
}

const EMPTY_FILTERS: FilterState = {
  status: "",
  payment_status: "",
  from_date: "",
  to_date: "",
  created_by: "",
};

export default function OrdersPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const [page, setPage] = useState(1);
  const limit = 15;
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const queryParams = {
    page,
    limit,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.payment_status
      ? { payment_status: filters.payment_status }
      : {}),
    ...(filters.from_date ? { from_date: filters.from_date } : {}),
    ...(filters.to_date ? { to_date: filters.to_date } : {}),
    ...(isAdmin && filters.created_by
      ? { created_by: Number(filters.created_by) }
      : {}),
  };

  const { data: response, isLoading } = useOrdersQuery(queryParams);
  const orders: Order[] = response?.data || [];
  const meta = response?.meta;

  const cancelMutation = useCancelOrderMutation();
  const confirmMutation = useConfirmPaymentMutation();

  const handleFilterChange = (f: FilterState) => {
    setFilters(f);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h2>📋 Quản lý Đơn hàng</h2>
          <p>Xem, lọc và quản lý tất cả các đơn hàng</p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={() => {
          setFilters(EMPTY_FILTERS);
          setPage(1);
        }}
        isAdmin={isAdmin}
      />

      {/* Content */}
      {isLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-muted)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "2.5rem" }}
          >
            hourglass_empty
          </span>
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      ) : orders.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-secondary)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "2.5rem", marginBottom: 8 }}
          >
            receipt_long
          </span>
          <p style={{ margin: 0 }}>
            {hasActiveFilters
              ? "Không có đơn hàng nào khớp với bộ lọc."
              : "Chưa có đơn hàng nào."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã ĐH</th>
                  <th>Thời gian</th>
                  {isAdmin && <th>Nhân viên</th>}
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th style={{ textAlign: "right" }}>Giảm giá</th>
                  <th style={{ textAlign: "right" }}>Tổng tiền</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          color: "var(--primary)",
                          fontSize: "inherit",
                          padding: 0,
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}
                        title="Xem chi tiết đơn hàng"
                      >
                        #{order.id}
                      </button>
                    </td>
                    <td
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </td>
                    {isAdmin && (
                      <td style={{ fontSize: "0.85rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "rgba(255,255,255,0.05)",
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: "0.8rem",
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "0.9rem" }}
                          >
                            person
                          </span>
                          #{order.created_by}
                        </span>
                      </td>
                    )}
                    <td style={{ fontSize: "0.85rem" }}>
                      <MethodIcon method={order.payment_method} />
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td style={{ textAlign: "right", fontSize: "0.85rem" }}>
                      {order.discount_amount > 0
                        ? `${order.discount_amount.toLocaleString("vi-VN")} đ`
                        : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {order.total_amount.toLocaleString("vi-VN")} đ
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="flex-row-end" style={{ gap: 6 }}>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "4px 10px",
                            fontSize: "0.78rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onClick={() => setSelectedOrderId(order.id)}
                          title="Xem chi tiết"
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "0.95rem" }}
                          >
                            visibility
                          </span>
                        </button>
                        {order.payment_status === "pending" &&
                          order.status !== "cancelled" && (
                            <button
                              className="btn btn-success"
                              style={{
                                padding: "4px 10px",
                                fontSize: "0.78rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              onClick={() => confirmMutation.mutate(order.id)}
                              disabled={confirmMutation.isPending}
                              title="Xác nhận thanh toán"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "0.95rem" }}
                              >
                                done
                              </span>
                            </button>
                          )}
                        {order.status !== "cancelled" &&
                          (isAdmin || order.created_by === user?.id) && (
                            <button
                              className="btn btn-danger"
                              style={{
                                padding: "4px 10px",
                                fontSize: "0.78rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Bạn có chắc muốn hủy đơn hàng này?",
                                  )
                                ) {
                                  cancelMutation.mutate(order.id);
                                }
                              }}
                              disabled={cancelMutation.isPending}
                              title="Hủy đơn"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "0.95rem" }}
                              >
                                close
                              </span>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total_pages >= 1 && (
            <div
              className="flex-row-between"
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <span
                style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}
              >
                Trang {page} / {meta.total_pages} &mdash; tổng{" "}
                {meta.total_items} đơn hàng
              </span>
              <div className="flex-row-end" style={{ gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                >
                  ‹ Trước
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setPage((p) => Math.min(meta.total_pages, p + 1))
                  }
                  disabled={page === meta.total_pages}
                  style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                >
                  Sau ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
