import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type {
  Promotion,
  CreatePromotionPayload,
  PromotionType,
} from "../types";

const optionalNonNegativeNumber = z.preprocess(
  (val) =>
    val === "" || val === undefined || val === null ? undefined : Number(val),
  z.number().min(0, "Phải >= 0").optional(),
);

const promotionSchema = z
  .object({
    code: z
      .string()
      .min(1, "Mã khuyến mãi không được để trống")
      .max(50, "Tối đa 50 ký tự")
      .transform((v) => v.toUpperCase()),
    name: z
      .string()
      .min(1, "Tên chương trình không được để trống")
      .max(150, "Tối đa 150 ký tự"),
    type: z.enum(["percent", "fixed"], {
      required_error: "Vui lòng chọn loại giảm giá",
    }),
    value: z.coerce.number().min(0.01, "Giá trị phải lớn hơn 0"),
    min_order_amount: optionalNonNegativeNumber,
    max_discount_amount: optionalNonNegativeNumber,
    is_active: z.boolean().default(true),
    starts_at: z.string().optional().or(z.literal("")),
    ends_at: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percent" && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Giảm giá theo % thì giá trị phải từ 1 đến 100",
      });
    }
    if (data.ends_at && data.starts_at && data.ends_at <= data.starts_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "Thời gian kết thúc phải sau thời gian bắt đầu",
      });
    }
  });

type PromotionFormValues = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
  initialValues?: Promotion;
  onSubmit: (values: CreatePromotionPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// input[type=datetime-local] cần format "yyyy-MM-ddTHH:mm", không có 'Z'/mili-giây
function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromotionForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
}: PromotionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: initialValues
      ? {
          code: initialValues.code,
          name: initialValues.name,
          type: initialValues.type,
          value: initialValues.value,
          min_order_amount: initialValues.min_order_amount ?? undefined,
          max_discount_amount: initialValues.max_discount_amount ?? undefined,
          is_active: initialValues.is_active,
          starts_at: toDatetimeLocal(initialValues.starts_at),
          ends_at: toDatetimeLocal(initialValues.ends_at),
        }
      : {
          code: "",
          name: "",
          type: "fixed" as PromotionType,
          value: 0,
          min_order_amount: undefined,
          max_discount_amount: undefined,
          is_active: true,
          starts_at: "",
          ends_at: "",
        },
  });

  const selectedType = watch("type");

  const handleFormSubmit = async (values: PromotionFormValues) => {
    const payload: CreatePromotionPayload = {
      code: values.code,
      name: values.name,
      type: values.type,
      value: values.value,
      min_order_amount: values.min_order_amount,
      max_discount_amount:
        values.type === "percent" ? values.max_discount_amount : undefined,
      is_active: values.is_active,
      starts_at: values.starts_at
        ? new Date(values.starts_at).toISOString()
        : undefined,
      ends_at: values.ends_at
        ? new Date(values.ends_at).toISOString()
        : undefined,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="code">Mã khuyến mãi *</label>
          <input
            id="code"
            type="text"
            className="form-control"
            placeholder="VD: TET2026"
            style={{ textTransform: "uppercase" }}
            {...register("code")}
          />
          {errors.code && <p className="form-error">{errors.code.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="type">Loại giảm giá *</label>
          <select id="type" className="form-control" {...register("type")}>
            <option value="fixed">Số tiền cố định (VND)</option>
            <option value="percent">Phần trăm (%)</option>
          </select>
          {errors.type && <p className="form-error">{errors.type.message}</p>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="name">Tên chương trình *</label>
        <input
          id="name"
          type="text"
          className="form-control"
          placeholder="VD: Giảm 20.000đ cho đơn từ 100.000đ"
          {...register("name")}
        />
        {errors.name && <p className="form-error">{errors.name.message}</p>}
      </div>

      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="value">
            Giá trị giảm *{" "}
            {selectedType === "percent" ? "(%, tối đa 100)" : "(VND)"}
          </label>
          <input
            id="value"
            type="number"
            step={selectedType === "percent" ? 1 : 1000}
            min={0.01}
            max={selectedType === "percent" ? 100 : undefined}
            className="form-control"
            {...register("value")}
          />
          {errors.value && <p className="form-error">{errors.value.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="min_order_amount">
            Giá trị đơn hàng tối thiểu (VND)
          </label>
          <input
            id="min_order_amount"
            type="number"
            min={0}
            className="form-control"
            placeholder="Không bắt buộc"
            {...register("min_order_amount")}
          />
          {errors.min_order_amount && (
            <p className="form-error">{errors.min_order_amount.message}</p>
          )}
        </div>
      </div>

      {selectedType === "percent" && (
        <div className="form-group">
          <label htmlFor="max_discount_amount">Số tiền giảm tối đa (VND)</label>
          <input
            id="max_discount_amount"
            type="number"
            min={0}
            className="form-control"
            placeholder="Không bắt buộc — chặn trần số tiền giảm khi tính theo %"
            {...register("max_discount_amount")}
          />
          {errors.max_discount_amount && (
            <p className="form-error">{errors.max_discount_amount.message}</p>
          )}
        </div>
      )}

      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="starts_at">Thời gian bắt đầu</label>
          <input
            id="starts_at"
            type="datetime-local"
            className="form-control"
            {...register("starts_at")}
          />
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            Bỏ trống = áp dụng ngay từ bây giờ
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="ends_at">Thời gian kết thúc</label>
          <input
            id="ends_at"
            type="datetime-local"
            className="form-control"
            {...register("ends_at")}
          />
          {errors.ends_at && (
            <p className="form-error">{errors.ends_at.message}</p>
          )}
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            Bỏ trống = không giới hạn thời gian
          </p>
        </div>
      </div>

      <div
        className="form-group"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          margin: "20px 0",
        }}
      >
        <input
          id="is_active"
          type="checkbox"
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
          {...register("is_active")}
        />
        <label htmlFor="is_active" style={{ margin: 0, cursor: "pointer" }}>
          Đang áp dụng
        </label>
      </div>

      <div className="flex-row-end" style={{ gap: "12px", marginTop: "24px" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : initialValues ? "Cập nhật" : "Tạo mới"}
        </button>
      </div>
    </form>
  );
}
