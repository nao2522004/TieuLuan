import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { useProductBatchesQuery } from "@/features/products/api/products.queries";
import type { Product } from "@/features/products/types";
import type { CreateAdjustmentPayload } from "../types";
import { ProductPicker } from "../../../components/ProductPicker";

const schema = z.object({
  branch_id: z.coerce.number().min(1, "Vui lòng chọn chi nhánh"),
  reason: z
    .string()
    .min(1, "Lý do không được để trống")
    .max(255, "Tối đa 255 ký tự"),
  note: z.string().max(255, "Tối đa 255 ký tự").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

const REASON_SUGGESTIONS = [
  "Hết hạn sử dụng",
  "Hỏng vỡ bao bì",
  "Thất thoát / mất hàng",
  "Lỗi sản xuất",
];

type BatchMode = "fefo" | "single" | "multi";

interface InventoryAdjustmentFormProps {
  onSubmit: (payload: CreateAdjustmentPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InventoryAdjustmentForm({
  onSubmit,
  onCancel,
  isLoading,
}: InventoryAdjustmentFormProps) {
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [productError, setProductError] = useState<string | null>(null);

  const { data: batches = [] } = useProductBatchesQuery(selectedProduct?.id);
  const activeBatches = batches.filter((b) => b.quantity_remaining > 0);

  const [batchMode, setBatchMode] = useState<BatchMode>("fefo");
  const [fefoQuantity, setFefoQuantity] = useState<number>(1);
  const [singleBatchId, setSingleBatchId] = useState<string>("");
  const [singleQuantity, setSingleQuantity] = useState<number>(1);
  const [multiQuantities, setMultiQuantities] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    setBatchMode("fefo");
    setFefoQuantity(1);
    setSingleBatchId("");
    setSingleQuantity(1);
    setMultiQuantities({});
  }, [selectedProduct?.id]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branch_id: undefined as unknown as number,
      reason: "",
      note: "",
    },
  });

  const branchId = watch("branch_id");

  const multiTotal = useMemo(
    () => Object.values(multiQuantities).reduce((s, q) => s + (q || 0), 0),
    [multiQuantities],
  );

  const totalQuantity =
    batchMode === "fefo"
      ? fefoQuantity
      : batchMode === "single"
        ? singleQuantity
        : multiTotal;

  const overStock =
    !!selectedProduct && totalQuantity > selectedProduct.stock_quantity;

  const handleMultiQtyChange = (batchId: number, value: number) => {
    setMultiQuantities((prev) => ({ ...prev, [batchId]: Math.max(0, value) }));
  };

  const handleFormSubmit = async (values: FormValues) => {
    if (!selectedProduct) {
      setProductError("Vui lòng chọn sản phẩm cần ghi nhận hao hụt");
      return;
    }
    setProductError(null);

    if (batchMode === "single" && !singleBatchId) {
      setProductError("Vui lòng chọn lô hàng cần trừ");
      return;
    }

    if (batchMode === "multi") {
      const selectedBatches = Object.entries(multiQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([batchId, qty]) => ({
          batch_id: Number(batchId),
          quantity: qty,
        }));

      if (selectedBatches.length === 0) {
        setProductError("Vui lòng nhập số lượng cho ít nhất 1 lô");
        return;
      }

      await onSubmit({
        product_id: selectedProduct.id,
        quantity: multiTotal,
        reason: values.reason,
        note: values.note || undefined,
        batches: selectedBatches,
      });
      return;
    }

    await onSubmit({
      product_id: selectedProduct.id,
      quantity: totalQuantity,
      reason: values.reason,
      note: values.note || undefined,
      batch_id: batchMode === "single" ? Number(singleBatchId) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="form-group">
        <label htmlFor="branch_id">Chi nhánh áp dụng *</label>
        <select
          id="branch_id"
          className="form-control"
          {...register("branch_id", {
            onChange: () => {
              setSelectedProduct(undefined);
              setProductError(null);
            },
          })}
        >
          <option value="">-- Chọn chi nhánh --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {errors.branch_id && (
          <p className="form-error">{errors.branch_id.message}</p>
        )}
      </div>

      <div className="form-group">
        <label>Sản phẩm *</label>
        <ProductPicker
          branchId={branchId ? Number(branchId) : undefined}
          value={selectedProduct}
          onChange={(p) => {
            setSelectedProduct(p);
            setProductError(null);
          }}
          onClear={() => setSelectedProduct(undefined)}
        />
        {productError && <p className="form-error">{productError}</p>}
      </div>

      {selectedProduct && (
        <div className="form-group">
          <label style={{ fontWeight: "bold" }}>Chọn cách trừ kho *</label>
          <p
            style={{
              fontSize: "0.78rem",
              color: overStock ? "var(--danger)" : "var(--text-muted)",
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            Tồn kho hiện tại: {selectedProduct.stock_quantity}{" "}
            {selectedProduct.unit}
            {overStock && " — vượt quá tồn kho, hệ thống sẽ từ chối khi lưu."}
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className={`btn ${batchMode === "fefo" ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1, fontSize: "0.82rem", padding: "8px 6px" }}
              onClick={() => setBatchMode("fefo")}
            >
              Tự động (FEFO)
            </button>
            <button
              type="button"
              className={`btn ${batchMode === "single" ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1, fontSize: "0.82rem", padding: "8px 6px" }}
              onClick={() => setBatchMode("single")}
              disabled={activeBatches.length === 0}
            >
              Chọn 1 lô
            </button>
            <button
              type="button"
              className={`btn ${batchMode === "multi" ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1, fontSize: "0.82rem", padding: "8px 6px" }}
              onClick={() => setBatchMode("multi")}
              disabled={activeBatches.length < 2}
            >
              Chọn nhiều lô
            </button>
          </div>

          {batchMode === "fefo" && (
            <div>
              <label style={{ fontSize: "0.85rem" }}>
                Tổng số lượng hao hụt/hủy *
              </label>
              <input
                type="number"
                min={1}
                className="form-control"
                value={fefoQuantity}
                onChange={(e) =>
                  setFefoQuantity(Math.max(1, Number(e.target.value)))
                }
              />
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Hệ thống tự động trừ lô có hạn sử dụng gần nhất trước (FEFO).
              </p>
            </div>
          )}

          {batchMode === "single" && (
            <div>
              <label style={{ fontSize: "0.85rem" }}>Chọn lô hàng *</label>
              <select
                className="form-control"
                value={singleBatchId}
                onChange={(e) => setSingleBatchId(e.target.value)}
              >
                <option value="">-- Chọn lô --</option>
                {activeBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Lô {b.batch_code} (Tồn: {b.quantity_remaining}{" "}
                    {selectedProduct.unit} — HSD:{" "}
                    {b.expiry_date
                      ? new Date(b.expiry_date).toLocaleDateString("vi-VN")
                      : "Không có"}
                    )
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: "0.85rem" }}>Số lượng trừ *</label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  value={singleQuantity}
                  onChange={(e) =>
                    setSingleQuantity(Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
            </div>
          )}

          {batchMode === "multi" && (
            <div>
              <div
                className="table-container"
                style={{ maxHeight: 220, overflowY: "auto" }}
              >
                <table
                  className="table"
                  style={{ margin: 0, fontSize: "0.82rem" }}
                >
                  <thead>
                    <tr>
                      <th>Mã lô</th>
                      <th>HSD</th>
                      <th style={{ textAlign: "right" }}>Tồn hiện tại</th>
                      <th style={{ textAlign: "right", width: 130 }}>
                        Số lượng trừ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBatches.map((b) => {
                      const qty = multiQuantities[b.id] ?? 0;
                      const batchOverstock = qty > b.quantity_remaining;
                      return (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.batch_code}</td>
                          <td>
                            {b.expiry_date
                              ? new Date(b.expiry_date).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {b.quantity_remaining}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <input
                              type="number"
                              min={0}
                              max={b.quantity_remaining}
                              className="form-control"
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.8rem",
                                textAlign: "right",
                                borderColor: batchOverstock
                                  ? "var(--danger)"
                                  : undefined,
                              }}
                              value={qty || ""}
                              placeholder="0"
                              onChange={(e) =>
                                handleMultiQtyChange(
                                  b.id,
                                  Number(e.target.value) || 0,
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  marginTop: 8,
                  fontWeight: 600,
                  color: overStock ? "var(--danger)" : "var(--text-secondary)",
                }}
              >
                Tổng số lượng trừ: {multiTotal} {selectedProduct.unit}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="reason">Lý do hao hụt/hủy *</label>
        <input
          id="reason"
          type="text"
          className="form-control"
          placeholder="VD: Hết hạn sử dụng, hỏng vỡ bao bì..."
          {...register("reason")}
        />
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
        >
          {REASON_SUGGESTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setValue("reason", r, { shouldValidate: true })}
              style={{
                padding: "4px 10px",
                borderRadius: 9999,
                fontSize: "0.75rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>
        {errors.reason && <p className="form-error">{errors.reason.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="note">Ghi chú thêm</label>
        <input
          id="note"
          type="text"
          className="form-control"
          placeholder="VD: Hộp sữa bị móp vỡ trong lúc sắp xếp"
          {...register("note")}
        />
        {errors.note && <p className="form-error">{errors.note.message}</p>}
      </div>

      <div className="flex-row-end" style={{ gap: 12, marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="btn btn-danger"
          disabled={isLoading || overStock}
        >
          {isLoading ? "Đang xử lý..." : "Ghi nhận hao hụt"}
        </button>
      </div>
    </form>
  );
}
