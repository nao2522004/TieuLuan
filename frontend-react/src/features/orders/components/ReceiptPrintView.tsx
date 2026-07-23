import type { Order } from "../types";

interface ReceiptPrintViewProps {
  order: Order;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  discountedItemsCount?: number;
}

const methodLabel: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
};

function Barcode({ value, label }: { value: string; label: string }) {
  const code39: Record<string, string> = {
    "0": "000110100",
    "1": "100100001",
    "2": "001100001",
    "3": "101100000",
    "4": "000110001",
    "5": "100110000",
    "6": "001110000",
    "7": "000100101",
    "8": "100100100",
    "9": "001100100",
    A: "100001001",
    B: "001001001",
    C: "101001000",
    D: "000011001",
    E: "100011000",
    F: "001011000",
    G: "000001101",
    H: "100001100",
    I: "001001100",
    J: "000011100",
    K: "100000011",
    L: "001000011",
    M: "101000010",
    N: "000010011",
    O: "100010010",
    P: "001010010",
    Q: "000000111",
    R: "100000110",
    S: "001000110",
    T: "000010110",
    U: "110000001",
    V: "011000001",
    W: "111000000",
    X: "010010001",
    Y: "110010000",
    Z: "011010000",
    "-": "000101010",
    "*": "001101000",
  };

  const str = `*${value.toUpperCase()}*`;
  const result: { type: "bar" | "space"; width: number }[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const pattern = code39[char];
    if (!pattern) continue;

    for (let j = 0; j < 9; j++) {
      const type = j % 2 === 0 ? "bar" : "space";
      const width = pattern[j] === "1" ? 3 : 1;
      result.push({ type, width });
    }
    result.push({ type: "space", width: 1 });
  }

  const unitWidth = 1.0;
  const height = 35;
  const totalUnits = result.reduce((sum, item) => sum + item.width, 0);
  const svgWidth = totalUnits * unitWidth;

  let currentX = 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "6px 0",
      }}
    >
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
      >
        {result.map((item, idx) => {
          const w = item.width * unitWidth;
          const x = currentX;
          currentX += w;
          if (item.type === "bar") {
            return (
              <rect
                key={idx}
                x={x}
                y={0}
                width={w}
                height={height}
                fill="#000"
              />
            );
          }
          return null;
        })}
      </svg>
      <span
        style={{
          fontSize: "0.7rem",
          fontFamily: "monospace",
          letterSpacing: "1px",
          marginTop: "2px",
          fontWeight: "bold",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function ReceiptPrintView({
  order,
  branchName,
  branchAddress,
  branchPhone,
  discountedItemsCount,
}: ReceiptPrintViewProps) {
  const isCancelled = order.status === "cancelled";

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
        {(() => {
          const date = new Date(order.created_at);
          const yy = String(date.getFullYear()).slice(-2);
          const mm = String(date.getMonth() + 1).padStart(2, "0");
          const dd = String(date.getDate()).padStart(2, "0");
          const dateStr = `${yy}${mm}${dd}`;
          const branchStr = String(order.branch_id).padStart(3, "0");
          const orderStr = String(order.id).padStart(6, "0");
          const codeVal = `400${dateStr}${branchStr}${orderStr}`;
          return (
            <Barcode
              value={codeVal}
              label={`(400) ${dateStr}${branchStr}${orderStr}`}
            />
          );
        })()}
      </div>

      {isCancelled && (
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: "0.95rem",
            border: "2px solid #000",
            padding: "4px 0",
            margin: "8px 0",
          }}
        >
          *** ĐƠN HÀNG ĐÃ HỦY ***
        </div>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      <div style={{ fontSize: "0.85rem" }}>
        <div>Hóa đơn: #{order.id}</div>
        <div>Ngày: {new Date(order.created_at).toLocaleString("vi-VN")}</div>
        <div>Nhân viên bán hàng: #{order.created_by}</div>
        {order.shift_id != null && <div>Ca làm việc: #{order.shift_id}</div>}
        <div>
          Thanh toán:{" "}
          {methodLabel[order.payment_method] ?? order.payment_method}
        </div>
        {order.payment_method === "transfer" && order.zalopay_app_trans_id && (
          <div>Mã GD ZaloPay: {order.zalopay_app_trans_id}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* Danh sách sản phẩm — trước đây hóa đơn in ra HOÀN TOÀN THIẾU phần này,
          chỉ có tổng tiền, khách không biết mình mua món gì. */}
      <div style={{ fontSize: "0.82rem" }}>
        {order.items.map((it) => {
          const hasDiscount = !!it.original_unit_price;
          const lineTotal = it.unit_price * it.quantity;
          return (
            <div key={it.id} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600 }}>
                {it.product_name ?? `Sản phẩm #${it.product_id}`}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                }}
              >
                <span>
                  {it.quantity} x {it.unit_price.toLocaleString("vi-VN")} đ
                  {hasDiscount && it.discount_percent != null && (
                    <span> (−{it.discount_percent}%)</span>
                  )}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {lineTotal.toLocaleString("vi-VN")} đ
                </span>
              </div>
              {hasDiscount && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    textDecoration: "line-through",
                    color: "#555",
                  }}
                >
                  Giá gốc: {it.original_unit_price!.toLocaleString("vi-VN")} đ
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {(() => {
        const grossOriginal = order.items.reduce(
          (sum, it) =>
            sum + (it.original_unit_price ?? it.unit_price) * it.quantity,
          0,
        );
        const expiryDiscountTotal = order.items.reduce((sum, it) => {
          if (!it.original_unit_price) return sum;
          return sum + (it.original_unit_price - it.unit_price) * it.quantity;
        }, 0);

        const expiryDiscountPercentAvg =
          grossOriginal > 0
            ? Math.round((expiryDiscountTotal / grossOriginal) * 1000) / 10
            : 0;

        const totalQuantity = order.items.reduce(
          (sum, it) => sum + it.quantity,
          0,
        );

        return (
          <div style={{ fontSize: "0.85rem" }}>
            {/* Tổng số lượng / số dòng — thông tin đối soát nhanh khi kiểm hàng */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tổng số lượng:</span>
              <span>
                {totalQuantity} món ({order.items.length} loại)
              </span>
            </div>

            {/* 1. Giá gốc */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span>Giá gốc:</span>
              <span>{grossOriginal.toLocaleString("vi-VN")} đ</span>
            </div>

            {/* 2. Giảm giá cận hạn/sự kiện */}
            {expiryDiscountTotal > 0 && (
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                    color: "#000",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    Giảm giá cận hạn/sự kiện
                    {discountedItemsCount
                      ? ` (${discountedItemsCount} món)`
                      : ""}
                    :
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    − {expiryDiscountTotal.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#000" }}>
                  (Mức giảm bình quân: −{expiryDiscountPercentAvg}%)
                </div>
              </div>
            )}

            {/* 3. Giảm giá cả đơn (mã KM hoặc nhập tay) */}
            {order.discount_amount > 0 && (
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    Giảm giá cả đơn
                    {order.promotion_code ? ` (${order.promotion_code})` : ""}:
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    − {order.discount_amount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                {order.promotion_type === "percent" &&
                  order.promotion_value != null && (
                    <div style={{ fontSize: "0.72rem", color: "#000" }}>
                      (Mức giảm: −{order.promotion_value}%)
                    </div>
                  )}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

      {/* 4. Giá cuối */}
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
