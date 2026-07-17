import type { Order } from "../types";

interface ReceiptPrintViewProps {
  order: Order;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
}

const methodLabel: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
};

export function ReceiptPrintView({
  order,
  branchName,
  branchAddress,
  branchPhone,
}: ReceiptPrintViewProps) {
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
          {branchName ?? `Chi nhánh #${order.branch_id}`}
        </div>
        {branchAddress && (
          <div style={{ fontSize: "0.8rem" }}>{branchAddress}</div>
        )}
        {branchPhone && (
          <div style={{ fontSize: "0.8rem" }}>ĐT: {branchPhone}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        <div>Hóa đơn: #{order.id}</div>
        <div>Ngày: {new Date(order.created_at).toLocaleString("vi-VN")}</div>
        <div>
          Thanh toán:{" "}
          {methodLabel[order.payment_method] ?? order.payment_method}
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <table
        style={{
          width: "100%",
          fontSize: "0.8rem",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            <th style={{ textAlign: "left" }}>SP</th>
            <th style={{ textAlign: "center" }}>SL</th>
            <th style={{ textAlign: "right" }}>T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name ?? `SP #${item.product_id}`}</td>
              <td style={{ textAlign: "center" }}>{item.quantity}</td>
              <td style={{ textAlign: "right" }}>
                {(item.unit_price * item.quantity).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {order.discount_amount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.85rem",
          }}
        >
          <span>Giảm giá:</span>
          <span>- {order.discount_amount.toLocaleString("vi-VN")} đ</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: "1rem",
          marginTop: 4,
        }}
      >
        <span>TỔNG CỘNG:</span>
        <span>{order.total_amount.toLocaleString("vi-VN")} đ</span>
      </div>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: "0.8rem" }}>
        Cảm ơn quý khách!
      </div>
    </div>
  );
}
