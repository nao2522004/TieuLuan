import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Category, CreateCategoryPayload } from "../types";

const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống").max(150, "Tối đa 150 ký tự"),
  description: z.string().max(255, "Tối đa 255 ký tự").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialValues?: Category;
  onSubmit: (values: CreateCategoryPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CategoryForm({ initialValues, onSubmit, onCancel, isLoading }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          description: initialValues.description ?? "",
          is_active: initialValues.is_active,
        }
      : {
          name: "",
          description: "",
          is_active: true,
        },
  });

  const handleFormSubmit = async (values: CategoryFormValues) => {
    const payload: CreateCategoryPayload = {
      name: values.name,
      description: values.description || undefined,
      is_active: values.is_active,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="form-group">
        <label htmlFor="name">Tên danh mục *</label>
        <input
          id="name"
          type="text"
          className="form-control"
          placeholder="Nhập tên danh mục (VD: Đồ uống, Đồ ăn nhanh...)..."
          {...register("name")}
        />
        {errors.name && <p className="form-error">{errors.name.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Mô tả</label>
        <textarea
          id="description"
          className="form-control"
          placeholder="Mô tả ngắn gọn danh mục..."
          rows={3}
          style={{ resize: "vertical", fontFamily: "var(--font-sans)" }}
          {...register("description")}
        />
        {errors.description && <p className="form-error">{errors.description.message}</p>}
      </div>

      <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "20px 0" }}>
        <input
          id="is_active"
          type="checkbox"
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
          {...register("is_active")}
        />
        <label htmlFor="is_active" style={{ margin: 0, cursor: "pointer" }}>Đang hoạt động</label>
      </div>

      <div className="flex-row-end" style={{ gap: "12px", marginTop: "24px" }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : initialValues ? "Cập nhật" : "Tạo mới"}
        </button>
      </div>
    </form>
  );
}
