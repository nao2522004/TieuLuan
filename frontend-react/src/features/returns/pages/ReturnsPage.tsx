import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOrderDetailQuery } from "@/features/orders/api/orders.queries";
import { useCreateReturnMutation } from "../api/returns.queries";

const returnSchema = z.object({
  order_id: z.coerce.number().min(1, "Nhập mã đơn hàng hợp lệ"),
  order_item_id: z.coerce.number().min(1, "Chọn dòng sản phẩm cần trả"),
  quantity: z.coerce.number().min(1, "Số lượng trả phải >= 1"),
  reason: z.string().max(255).optional().or(z.literal("")),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

export default function ReturnsPage() {
  const [searchOrderId, setSearchOrderId] = useState<number | undefined>(undefined);
  const [orderInputValue, setOrderInputValue] = useState("");
  const [returnResult, setReturnResult] = useState<{ refund_amount: number } | null>(null);

  const { data: orderDetail, isLoading: isOrderLoading, isError: isOrderError } = useOrderDetailQuery(searchOrderId);
  const createReturnMutation = useCreateReturnMutation();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: { order_id: 0, order_item_id: 0, quantity: 1, reason: "" },
  });

  const selectedItemId = watch("order_item_id");
  const selectedItem = orderDetail?.items.find((i) => i.id === Number(selectedItemId));
  const qtyToReturn = watch("quantity");
  const estimatedRefund = selectedItem ? selectedItem.unit_price * Math.max(0, qtyToReturn) : 0;

  const handleSearchOrder = () => {
    const id = parseInt(orderInputValue);
    if (!isNaN(id) && id > 0) {
      setSearchOrderId(id);
    }
  };

  const onSubmit = async (values: ReturnFormValues) => {
    const result = await createReturnMutation.mutateAsync({
      order_item_id: values.order_item_id,
      quantity: values.quantity,
      reason: values.reason || undefined,
    });
    setReturnResult({ refund_amount: result.refund_amount });
    reset();
    setSearchOrderId(undefined);
    setOrderInputValue("");
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>↩️ Xử lý Trả hàng</h2>
          <p>Tìm đơn hàng gốc và xử lý yêu cầu trả sản phẩm</p>
        </div>
      </div>

      <div className="grid-cols-2" style={{ gap: "24px", alignItems: "start" }}>
        {/* Left: Lookup order */}
        <div>
          <div className="card" style={{ marginBottom: "16px" }}>
            <h3 style={{ marginBottom: "12px", fontSize: "1rem" }}>🔍 Tra cứu đơn hàng</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="number"
                className="form-control"
                placeholder="Nhập mã đơn hàng (VD: 123)..."
                value={orderInputValue}
                onChange={(e) => setOrderInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchOrder()}
              />
              <button className="btn btn-primary" onClick={handleSearchOrder} style={{ flexShrink: 0 }}>
                Tìm
              </button>
            </div>
          </div>

          {isOrderLoading && <div style={{ textAlign: "center", padding: "20px" }}>Đang tìm đơn hàng...</div>}
          {isOrderError && <div className="card" style={{ color: "var(--danger)" }}>❌ Không tìm thấy đơn hàng.</div>}

          {orderDetail && (
            <div className="card">
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontWeight: "700", color: "var(--primary)" }}>ĐH #{orderDetail.id}</span>
                <span style={{ margin: "0 8px", color: "var(--text-muted)" }}>•</span>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  {new Date(orderDetail.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>SP ID</th>
                    <th>SL mua</th>
                    <th>Đơn giá</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetail.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: "600", color: "var(--primary)" }}>#{item.id}</td>
                      <td>SP #{item.product_id}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit_price.toLocaleString("vi-VN")} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Return form */}
        <div className="card">
          <h3 style={{ marginBottom: "20px", fontSize: "1rem" }}>📝 Thông tin trả hàng</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label htmlFor="order_item_id">Item ID cần trả *</label>
              <input id="order_item_id" type="number" className="form-control" placeholder="Nhập Item ID từ đơn hàng..." {...register("order_item_id")} />
              {errors.order_item_id && <p className="form-error">{errors.order_item_id.message}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="return_qty">Số lượng trả *</label>
              <input id="return_qty" type="number" className="form-control" min={1} {...register("quantity")} />
              {errors.quantity && <p className="form-error">{errors.quantity.message}</p>}
            </div>

            {estimatedRefund > 0 && (
              <div style={{ padding: "12px", background: "rgba(16,185,129,0.08)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", marginBottom: "16px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  💰 Ước tính hoàn tiền: <strong style={{ color: "var(--success)", fontSize: "1.1rem" }}>{estimatedRefund.toLocaleString("vi-VN")} đ</strong>
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  (Số tiền thực tế do backend tính toán từ giá gốc snapshot)
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="return_reason">Lý do trả hàng</label>
              <textarea id="return_reason" className="form-control" rows={3} placeholder="VD: Sản phẩm bị lỗi, sai màu..." style={{ resize: "vertical", fontFamily: "var(--font-sans)" }} {...register("reason")} />
            </div>

            <button type="submit" className="btn btn-warning" style={{ width: "100%", padding: "12px" }} disabled={createReturnMutation.isPending}>
              {createReturnMutation.isPending ? "Đang xử lý..." : "↩️ Xác nhận trả hàng"}
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {returnResult && (
        <div className="modal-overlay">
          <div className="modal-box animate-slide-in" style={{ maxWidth: "400px", textAlign: "center" }}>
            <div className="modal-content">
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
              <h3 style={{ marginBottom: "8px" }}>Trả hàng thành công!</h3>
              <p>Số tiền hoàn trả:</p>
              <h2 style={{ fontSize: "2rem", color: "var(--success)", margin: "8px 0" }}>
                {returnResult.refund_amount.toLocaleString("vi-VN")} đ
              </h2>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={() => setReturnResult(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
