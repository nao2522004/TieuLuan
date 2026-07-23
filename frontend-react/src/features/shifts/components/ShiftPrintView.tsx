import type { ShiftDetail } from "../types";

interface ShiftPrintViewProps {
  shift: ShiftDetail;
}

const methodLabel: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
};

export function ShiftPrintView({ shift }: ShiftPrintViewProps) {
  return (
    <div
      id="print-receipt"
      className="print-receipt-hidden"
      style={{
        fontFamily: "monospace",
        width: "300px",
        color: "#000",
        background: "#fff",
        padding: "12px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
          BIÊN BẢN ĐỐI SOÁT CA
        </div>
        <div style={{ fontSize: "0.85rem" }}>
          {shift.branch_name ?? `Chi nhánh #${shift.branch_id}`}
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        <div>Mã ca: #{shift.id}</div>
        <div>Trưởng ca: {shift.user_full_name ?? `#${shift.user_id}`}</div>
        <div>Mở ca: {new Date(shift.opened_at).toLocaleString("vi-VN")}</div>
        <div>
          Đóng ca:{" "}
          {shift.closed_at
            ? new Date(shift.closed_at).toLocaleString("vi-VN")
            : "Chưa đóng"}
        </div>
        {shift.cashiers && shift.cashiers.length > 0 && (
          <div>
            Thu ngân: {shift.cashiers.map((c) => c.full_name).join(", ")}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Quỹ đầu ca:</span>
          <span>{shift.opening_cash.toLocaleString("vi-VN")} đ</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Tiền mặt bán được:</span>
          <span>+{shift.cash_orders_total.toLocaleString("vi-VN")} đ</span>
        </div>
        {shift.cash_returns_total > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tiền mặt hoàn trả:</span>
            <span>-{shift.cash_returns_total.toLocaleString("vi-VN")} đ</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Doanh thu Thẻ:</span>
          <span>{shift.card_orders_total.toLocaleString("vi-VN")} đ</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Doanh thu ZaloPay:</span>
          <span>{shift.transfer_orders_total.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Quỹ dự kiến:</span>
          <span>
            {(shift.expected_cash ?? shift.live_expected_cash).toLocaleString(
              "vi-VN",
            )}{" "}
            đ
          </span>
        </div>
        {shift.closing_cash != null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Quỹ đếm thực tế:</span>
            <span>{shift.closing_cash.toLocaleString("vi-VN")} đ</span>
          </div>
        )}
        {shift.cash_difference != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            <span>Chênh lệch:</span>
            <span>
              {shift.cash_difference > 0 ? "+" : ""}
              {shift.cash_difference.toLocaleString("vi-VN")} đ
            </span>
          </div>
        )}
        {shift.note && (
          <div style={{ marginTop: 6, fontStyle: "italic" }}>
            Ghi chú: {shift.note}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.8rem" }}>
        <div style={{ marginBottom: 6, fontWeight: 700 }}>
          Danh sách đơn ({shift.orders.length} đơn):
        </div>
        {shift.orders.map((o) => {
          const returnsTotal =
            o.refunded_amount ??
            (shift.returns || [])
              .filter((r) => r.order_id === o.id)
              .reduce((sum, r) => sum + r.refund_amount, 0);

          let statusTag = "Hoàn thành";
          let isDanger = false;
          let isWarning = false;

          if (o.status === "cancelled") {
            statusTag = "Đã hủy";
            isDanger = true;
          } else if (returnsTotal >= o.total_amount && o.total_amount > 0) {
            statusTag = "Đã trả hàng";
            isWarning = true;
          } else if (returnsTotal > 0) {
            statusTag = `Trả 1 phần (-${returnsTotal.toLocaleString("vi-VN")}đ)`;
            isWarning = true;
          } else if (o.payment_status === "pending") {
            statusTag = "Chờ TT";
            isWarning = true;
          }

          return (
            <div
              key={o.id}
              style={{
                marginBottom: 4,
                paddingBottom: 4,
                borderBottom: "1px dotted #ccc",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>
                  <strong>#{o.id}</strong> ({methodLabel[o.payment_method] ?? o.payment_method})
                </span>
                <span>{o.total_amount.toLocaleString("vi-VN")} đ</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  color: isDanger ? "#d9534f" : isWarning ? "#f0ad4e" : "#555",
                  marginTop: 1,
                }}
              >
                <span>Trạng thái: [{statusTag}]</span>
                {o.created_by_name && (
                  <span style={{ color: "#777" }}>NV: {o.created_by_name}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {shift.returns && shift.returns.length > 0 && (
        <>
          <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
          <div style={{ fontSize: "0.8rem" }}>
            <div style={{ marginBottom: 4 }}>
              Danh sách trả hàng ({shift.returns.length} lượt):
            </div>
            {shift.returns.map((r) => (
              <div
                key={r.id}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>
                  Đơn #{r.order_id} - {r.product_name ?? `Sp #${r.order_item_id}`} (x{r.quantity})
                </span>
                <span>-{r.refund_amount.toLocaleString("vi-VN")} đ</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.8rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div>Người bàn giao</div>
          <div style={{ marginTop: 32 }}>____________</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div>Người nhận</div>
          <div style={{ marginTop: 32 }}>____________</div>
        </div>
      </div>
    </div>
  );
}
