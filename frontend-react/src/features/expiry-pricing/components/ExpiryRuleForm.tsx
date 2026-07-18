import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type {
  ExpiryDiscountRule,
  CreateExpiryDiscountRulePayload,
} from "../types";

const ruleSchema = z.object({
  days_before_expiry: z.coerce
    .number()
    .int("Phải là số nguyên")
    .min(0, "Phải >= 0 (0 = đã hết hạn)"),
  discount_percent: z.coerce
    .number()
    .min(0.01, "Phải > 0")
    .max(100, "Tối đa 100"),
  is_active: z.boolean().default(true),
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
    formState: { errors },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: initialValues
      ? {
          days_before_expiry: initialValues.days_before_expiry,
          discount_percent: initialValues.discount_percent,
          is_active: initialValues.is_active,
        }
      : {
          days_before_expiry: 3,
          discount_percent: 20,
          is_active: true,
        },
  });

  const handleFormSubmit = async (values: RuleFormValues) => {
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
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
