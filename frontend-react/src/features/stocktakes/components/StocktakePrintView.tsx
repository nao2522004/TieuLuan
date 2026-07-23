import type { Stocktake } from "../types";

interface StocktakePrintViewProps {
  stocktake: Stocktake;
}

export function StocktakePrintView({ stocktake }: StocktakePrintViewProps) {
  const items = stocktake.items ?? [];
  const totalItems = items.length;
  const matchedCount = items.filter((i) => i.difference === 0).length;
  const surplusCount = items.filter((i) => i.difference > 0).length;
  const deficitCount = items.filter((i) => i.difference < 0).length;

  return (
    <div id="print-receipt" className="print-receipt-hidden">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt, #print-receipt * {
            visibility: visible;
          }
          #print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            color: #000 !important;
            background: #fff !important;
            font-family: Arial, sans-serif;
            font-size: 13px;
            line-height: 1.4;
          }
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .print-header h2 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .print-meta {
            margin-bottom: 15px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 12px;
          }
          .print-summary {
            display: flex;
            justify-content: space-around;
            background: #f5f5f5;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .print-table th, .print-table td {
            border: 1px solid #333;
            padding: 6px 8px;
            text-align: left;
            font-size: 12px;
          }
          .print-table th {
            background-color: #eee;
            text-transform: uppercase;
            font-size: 11px;
          }
          .text-right {
            text-align: right !important;
          }
          .text-center {
            text-align: center !important;
          }
          .diff-neg {
            color: #c53030 !important;
            font-weight: bold;
          }
          .diff-pos {
            color: #276749 !important;
            font-weight: bold;
          }
          .batch-adjust-tag {
            font-size: 11px;
            margin-top: 3px;
            padding: 2px 4px;
            background: #edf2f7;
            border-radius: 3px;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            page-break-inside: avoid;
          }
          .signature-box {
            text-align: center;
            width: 30%;
          }
          .signature-space {
            height: 60px;
          }
        }
      `}</style>

      <div className="print-header">
        <h2>BIÊN BẢN KIỂM KÊ KHO HÀNG</h2>
        <div style={{ fontSize: 13, marginTop: 4, fontWeight: "bold" }}>
          Chi nhánh: {stocktake.branch_name ?? `Chi nhánh #${stocktake.branch_id}`}
        </div>
        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
          Mã phiên kiểm kê: <strong>#{stocktake.id}</strong>
        </div>
      </div>

      <div className="print-meta">
        <div>
          <strong>Người tạo phiên:</strong> {stocktake.creator_name ?? `User #${stocktake.created_by}`}
        </div>
        <div>
          <strong>Trạng thái:</strong>{" "}
          {stocktake.status === "closed" ? "ĐÃ CHỐT" : "ĐANG MỞ KIỂM KÊ"}
        </div>
        <div>
          <strong>Thời gian bắt đầu:</strong>{" "}
          {new Date(stocktake.created_at).toLocaleString("vi-VN")}
        </div>
        <div>
          <strong>Thời gian hoàn tất:</strong>{" "}
          {stocktake.closed_at
            ? new Date(stocktake.closed_at).toLocaleString("vi-VN")
            : "Chưa hoàn tất"}
        </div>
        {stocktake.note && (
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Ghi chú phiên:</strong> {stocktake.note}
          </div>
        )}
      </div>

      <div className="print-summary">
        <div>Tổng dòng đếm: <strong>{totalItems}</strong></div>
        <div>Khớp tồn: <strong style={{ color: "#2b6cb0" }}>{matchedCount}</strong></div>
        <div>Thừa kho: <strong style={{ color: "#276749" }}>+{surplusCount}</strong></div>
        <div>Thiếu kho: <strong style={{ color: "#c53030" }}>-{deficitCount}</strong></div>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th className="text-center" style={{ width: 35 }}>STT</th>
            <th>Mã SP / Barcode</th>
            <th>Tên sản phẩm & Chi tiết Lô biến động</th>
            <th className="text-center" style={{ width: 45 }}>ĐVT</th>
            <th className="text-right" style={{ width: 75 }}>Tồn hệ thống</th>
            <th className="text-right" style={{ width: 75 }}>Đếm thực tế</th>
            <th className="text-right" style={{ width: 75 }}>Chênh lệch</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center">Chưa có sản phẩm nào trong phiên kiểm kê</td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id}>
                <td className="text-center">{idx + 1}</td>
                <td>
                  <div>#{item.product_id}</div>
                  {item.product_barcode && (
                    <div style={{ fontSize: 10, color: "#666" }}>{item.product_barcode}</div>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: "bold" }}>{item.product_name ?? `Sản phẩm #${item.product_id}`}</div>
                  
                  {/* Nếu đã chốt phiên và có thông tin lô bị điều chỉnh tăng/giảm */}
                  {item.batch_adjustments && item.batch_adjustments.length > 0 ? (
                    <div style={{ marginTop: 4 }}>
                      {item.batch_adjustments.map((adj, aIdx) => (
                        <div key={aIdx} className="batch-adjust-tag">
                          {adj.type === "OUT" ? (
                            <span style={{ color: "#c53030", fontWeight: "bold" }}>
                              🔻 Lô bị giảm (xuất bớt): <strong>{adj.batch_code}</strong> (-{adj.quantity} sp)
                              {adj.expiry_date && <span> (HSD: {adj.expiry_date})</span>}
                            </span>
                          ) : (
                            <span style={{ color: "#276749", fontWeight: "bold" }}>
                              🔺 Lô được cộng (nhập thêm): <strong>{adj.batch_code}</strong> (+{adj.quantity} sp)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : item.batches && item.batches.length > 0 ? (
                    <div style={{ fontSize: 10, color: "#4a5568", marginTop: 2 }}>
                      Lô hàng hiện có: {item.batches.map((b) => `${b.batch_code}${b.expiry_date ? ` (HSD: ${b.expiry_date})` : ""}`).join(", ")}
                    </div>
                  ) : null}
                </td>
                <td className="text-center">{item.unit ?? "Sp"}</td>
                <td className="text-right">{item.system_quantity}</td>
                <td className="text-right" style={{ fontWeight: "bold" }}>{item.counted_quantity}</td>
                <td className={`text-right ${item.difference < 0 ? "diff-neg" : item.difference > 0 ? "diff-pos" : ""}`}>
                  {item.difference > 0 ? `+${item.difference}` : item.difference}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="signatures">
        <div className="signature-box">
          <strong>Người kiểm kê</strong>
          <div style={{ fontSize: 11, fontStyle: "italic", color: "#666" }}>(Ký, ghi rõ họ tên)</div>
          <div className="signature-space"></div>
          <div>{stocktake.creator_name ?? ""}</div>
        </div>
        <div className="signature-box">
          <strong>Thủ kho</strong>
          <div style={{ fontSize: 11, fontStyle: "italic", color: "#666" }}>(Ký, ghi rõ họ tên)</div>
          <div className="signature-space"></div>
        </div>
        <div className="signature-box">
          <strong>Quản lý / Giám sát</strong>
          <div style={{ fontSize: 11, fontStyle: "italic", color: "#666" }}>(Ký, ghi rõ họ tên)</div>
          <div className="signature-space"></div>
        </div>
      </div>
    </div>
  );
}
