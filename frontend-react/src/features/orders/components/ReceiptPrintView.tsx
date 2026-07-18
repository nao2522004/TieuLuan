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

function Barcode({ value, label }: { value: string; label: string }) {
  const code39: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '000101010', '*': '001101000'
  };

  const str = `*${value.toUpperCase()}*`;
  const result: { type: 'bar' | 'space'; width: number }[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const pattern = code39[char];
    if (!pattern) continue;

    for (let j = 0; j < 9; j++) {
      const type = j % 2 === 0 ? 'bar' : 'space';
      const width = pattern[j] === '1' ? 3 : 1;
      result.push({ type, width });
    }
    result.push({ type: 'space', width: 1 });
  }

  const unitWidth = 1.0;
  const height = 35;
  const totalUnits = result.reduce((sum, item) => sum + item.width, 0);
  const svgWidth = totalUnits * unitWidth;

  let currentX = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "6px 0" }}>
      <svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
        {result.map((item, idx) => {
          const w = item.width * unitWidth;
          const x = currentX;
          currentX += w;
          if (item.type === 'bar') {
            return <rect key={idx} x={x} y={0} width={w} height={height} fill="#000" />;
          }
          return null;
        })}
      </svg>
      <span style={{ fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "1px", marginTop: "2px", fontWeight: "bold" }}>
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
        {(() => {
          const date = new Date(order.created_at);
          const yy = String(date.getFullYear()).slice(-2);
          const mm = String(date.getMonth() + 1).padStart(2, "0");
          const dd = String(date.getDate()).padStart(2, "0");
          const dateStr = `${yy}${mm}${dd}`;
          const branchStr = String(order.branch_id).padStart(3, "0");
          const orderStr = String(order.id).padStart(6, "0");
          const codeVal = `400${dateStr}${branchStr}${orderStr}`;
          return <Barcode value={codeVal} label={`(400) ${dateStr}${branchStr}${orderStr}`} />;
        })()}
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
