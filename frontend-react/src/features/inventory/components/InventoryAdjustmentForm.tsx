import { useState } from "react";
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
  quantity: z.coerce.number().int("Phải là số nguyên").positive("Phải > 0"),
  batch_id: z.coerce.number().optional().or(z.literal("")),
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branch_id: undefined as unknown as number,
      quantity: 1,
      batch_id: "",
      reason: "",
      note: "",
    },
  });

  const branchId = watch("branch_id");
  const quantity = watch("quantity");

  const overStock =
    !!selectedProduct && Number(quantity) > selectedProduct.stock_quantity;

  const handleFormSubmit = async (values: FormValues) => {
    if (!selectedProduct) {
      setProductError("Vui lòng chọn sản phẩm cần ghi nhận hao hụt");
      return;
    }
    setProductError(null);
    await onSubmit({
      product_id: selectedProduct.id,
      quantity: values.quantity,
      reason: values.reason,
      note: values.note || undefined,
      batch_id: values.batch_id ? Number(values.batch_id) : undefined,
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

      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="quantity">Số lượng hao hụt/hủy *</label>
          <input
            id="quantity"
            type="number"
            min={1}
            className="form-control"
            {...register("quantity")}
          />
          {selectedProduct && (
            <p
              style={{
                fontSize: "0.78rem",
                marginTop: 4,
                color: overStock ? "var(--danger)" : "var(--text-muted)",
              }}
            >
              Tồn kho hiện tại: {selectedProduct.stock_quantity}{" "}
              {selectedProduct.unit}
              {overStock && " — vượt quá tồn kho, hệ thống sẽ từ chối khi lưu."}
            </p>
          )}
          {errors.quantity && (
            <p className="form-error">{errors.quantity.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="batch_id">Lô hàng trừ kho (tùy chọn)</label>
          <select
            id="batch_id"
            className="form-control"
            {...register("batch_id")}
            disabled={!selectedProduct}
          >
            <option value="">-- Tự động trừ theo lô gần nhất (FEFO) --</option>
            {activeBatches.map((b) => (
              <option key={b.id} value={b.id}>
                Lô {b.batch_code} (Tồn: {b.quantity_remaining} {selectedProduct?.unit || ""} — HSD: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString("vi-VN") : "Không có"})
              </option>
            ))}
          </select>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
            Bỏ trống nếu muốn tự động trừ lô cận hạn nhất
          </p>
        </div>
      </div>

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
        <button type="submit" className="btn btn-danger" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : "Ghi nhận hao hụt"}
        </button>
      </div>
    </form>
  );
}
