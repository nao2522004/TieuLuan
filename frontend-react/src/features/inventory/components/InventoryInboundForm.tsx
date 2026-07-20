import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import type { Product } from "@/features/products/types";
import type { CreateInboundPayload } from "../types";
import { ProductPicker } from "../../../components/ProductPicker";

const schema = z.object({
  branch_id: z.coerce.number().min(1, "Vui lòng chọn chi nhánh"),
  quantity: z.coerce.number().int("Phải là số nguyên").positive("Phải > 0"),
  unit_cost: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : Number(v)),
    z.number().min(0, "Phải >= 0").optional(),
  ),
  expiry_date: z.string().optional().or(z.literal("")),
  batch_code: z
    .string()
    .max(100, "Tối đa 100 ký tự")
    .optional()
    .or(z.literal("")),
  note: z.string().max(255, "Tối đa 255 ký tự").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface InventoryInboundFormProps {
  onSubmit: (payload: CreateInboundPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InventoryInboundForm({
  onSubmit,
  onCancel,
  isLoading,
}: InventoryInboundFormProps) {
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [productError, setProductError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branch_id: undefined as unknown as number,
      quantity: 1,
      note: "",
    },
  });

  const branchId = watch("branch_id");

  const handleFormSubmit = async (values: FormValues) => {
    if (!selectedProduct) {
      setProductError("Vui lòng chọn sản phẩm cần nhập kho");
      return;
    }
    setProductError(null);
    await onSubmit({
      product_id: selectedProduct.id,
      quantity: values.quantity,
      unit_cost: values.unit_cost,
      expiry_date: values.expiry_date || undefined,
      batch_code: values.batch_code || undefined,
      note: values.note || undefined,
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
          <label htmlFor="quantity">Số lượng nhập thêm *</label>
          <input
            id="quantity"
            type="number"
            min={1}
            className="form-control"
            {...register("quantity")}
          />
          {errors.quantity && (
            <p className="form-error">{errors.quantity.message}</p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="unit_cost">Giá vốn tham khảo (VND)</label>
          <input
            id="unit_cost"
            type="number"
            min={0}
            className="form-control"
            placeholder="Không bắt buộc"
            {...register("unit_cost")}
          />
          {errors.unit_cost && (
            <p className="form-error">{errors.unit_cost.message}</p>
          )}
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="expiry_date">Hạn sử dụng của lô hàng</label>
          <input
            id="expiry_date"
            type="date"
            className="form-control"
            {...register("expiry_date")}
          />
          {errors.expiry_date && (
            <p className="form-error">{errors.expiry_date.message}</p>
          )}
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            Không bắt buộc — bỏ trống nếu hàng không có hạn sử dụng
          </p>
        </div>
        <div className="form-group">
          <label htmlFor="batch_code">Mã lô (tùy chọn)</label>
          <input
            id="batch_code"
            type="text"
            className="form-control"
            placeholder="VD: LÔ-20261231-01"
            {...register("batch_code")}
          />
          {errors.batch_code && (
            <p className="form-error">{errors.batch_code.message}</p>
          )}
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            Bỏ trống hệ thống sẽ tự sinh mã lô
          </p>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="note">Ghi chú</label>
        <input
          id="note"
          type="text"
          className="form-control"
          placeholder="VD: Nhập hàng từ NCC ABC"
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
        <button type="submit" className="btn btn-success" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : "Nhập kho"}
        </button>
      </div>
    </form>
  );
}
