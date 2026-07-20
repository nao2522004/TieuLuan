import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/features/auth";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import type { CreateStocktakePayload } from "../types";

const schema = z.object({
  branch_id: z.coerce.number().optional(),
  note: z.string().max(255, "Tối đa 255 ký tự").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface CreateStocktakeFormProps {
  onSubmit: (payload: CreateStocktakePayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CreateStocktakeForm({
  onSubmit,
  onCancel,
  isLoading,
}: CreateStocktakeFormProps) {
  const { user } = useAuth();
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { note: "" },
  });

  const handleFormSubmit = async (values: FormValues) => {
    await onSubmit({
      branch_id: user?.branch_id ? undefined : values.branch_id,
      note: values.note || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      {!user?.branch_id && (
        <div className="form-group">
          <label htmlFor="branch_id">Chi nhánh kiểm kê *</label>
          <select
            id="branch_id"
            className="form-control"
            {...register("branch_id")}
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
      )}

      <div className="form-group">
        <label htmlFor="note">Ghi chú (tùy chọn)</label>
        <input
          id="note"
          type="text"
          className="form-control"
          placeholder="VD: Kiểm kê định kỳ tháng 7"
          {...register("note")}
        />
        {errors.note && <p className="form-error">{errors.note.message}</p>}
      </div>

      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          marginBottom: 20,
        }}
      >
        Sau khi mở phiên, bạn sẽ nhập số lượng đếm thực tế từng sản phẩm. Tồn
        kho chỉ thay đổi khi <strong>chốt phiên</strong>.
      </p>

      <div className="flex-row-end" style={{ gap: 12, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Đang mở phiên..." : "Mở phiên kiểm kê"}
        </button>
      </div>
    </form>
  );
}
