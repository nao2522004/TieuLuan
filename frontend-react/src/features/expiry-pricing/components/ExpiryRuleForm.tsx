import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type {
  ExpiryDiscountRule,
  CreateExpiryDiscountRulePayload,
} from "../types";

const ruleSchema = z
  .object({
    scope: z.enum(["expiry", "all_products"]).default("expiry"),
    days_before_expiry: z.coerce
      .number()
      .int("Phải là số nguyên")
      .min(0, "Phải >= 0 (0 = đã hết hạn)")
      .optional(),
    discount_percent: z.coerce
      .number()
      .min(0.01, "Phải > 0")
      .max(100, "Tối đa 100"),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "expiry" && data.days_before_expiry === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days_before_expiry"],
        message: "Bắt buộc khi áp dụng theo hạn sử dụng",
      });
    }
  });

type RuleFormValues = z.infer<typeof ruleSchema>;

interface ExpiryRuleFormProps {
  initialValues?: ExpiryDiscountRule;
  onSubmit: (values: CreateExpiryDiscountRulePayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ExpiryRuleForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
}: ExpiryRuleFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: initialValues
      ? {
          scope: initialValues.scope,
          days_before_expiry: initialValues.days_before_expiry ?? undefined,
          discount_percent: initialValues.discount_percent,
          is_active: initialValues.is_active,
        }
      : {
          scope: "expiry",
          days_before_expiry: 3,
          discount_percent: 20,
          is_active: true,
        },
  });

  const scope = watch("scope");

  const handleFormSubmit = async (values: RuleFormValues) => {
    await onSubmit({
      scope: values.scope,
      days_before_expiry:
        values.scope === "expiry" ? values.days_before_expiry : undefined,
      discount_percent: values.discount_percent,
      is_active: values.is_active,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="form-group">
        <label htmlFor="scope">Phạm vi áp dụng *</label>
        <select id="scope" className="form-control" {...register("scope")}>
          <option value="expiry">Theo hạn sử dụng (sản phẩm cận hạn)</option>
          <option value="all_products">
            Toàn bộ sản phẩm (sự kiện giảm giá, VD: Tết, Black Friday)
          </option>
        </select>
      </div>

      {scope === "expiry" && (
        <div className="form-group">
          <label htmlFor="days_before_expiry">
            Áp dụng khi còn bao nhiêu ngày tới hạn *
          </label>
          <input
            id="days_before_expiry"
            type="number"
            min={0}
            className="form-control"
            placeholder="VD: 3 (còn 3 ngày là hết hạn), 0 = đã hết hạn"
            {...register("days_before_expiry")}
          />
          {errors.days_before_expiry && (
            <p className="form-error">{errors.days_before_expiry.message}</p>
          )}
        </div>
      )}

      {scope === "all_products" && (
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            marginBottom: 16,
          }}
        >
          💡 Rule này sẽ áp dụng cho <strong>tất cả sản phẩm</strong>, không cần
          hạn sử dụng. Phù hợp cho sự kiện giảm giá toàn cửa hàng.
        </p>
      )}

      <div className="form-group">
        <label htmlFor="discount_percent">Phần trăm giảm giá (%) *</label>
        <input
          id="discount_percent"
          type="number"
          min={0.01}
          max={100}
          step={0.5}
          className="form-control"
          placeholder="VD: 30"
          {...register("discount_percent")}
        />
        {errors.discount_percent && (
          <p className="form-error">{errors.discount_percent.message}</p>
        )}
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
