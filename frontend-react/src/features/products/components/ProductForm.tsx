import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { useCategoriesQuery } from "@/features/categories/api/categories.queries";
import type { Product, CreateProductPayload } from "../types";

const productSchema = z.object({
  branch_id: z.coerce.number().min(1, "Vui lòng chọn chi nhánh"),
  category_id: z.coerce.number().min(1, "Vui lòng chọn danh mục"),
  barcode: z.string().min(1, "Mã vạch (Barcode) không được để trống").max(50, "Mã vạch tối đa 50 ký tự"),
  name: z.string().min(1, "Tên sản phẩm không được để trống").max(200, "Tên sản phẩm tối đa 200 ký tự"),
  unit: z.string().min(1, "Đơn vị tính không được để trống").max(20, "Đơn vị tính tối đa 20 ký tự"),
  cost_price: z.coerce.number().min(0, "Giá vốn phải lớn hơn hoặc bằng 0"),
  sale_price: z.coerce.number().min(0, "Giá bán phải lớn hơn hoặc bằng 0"),
  stock_quantity: z.coerce.number().min(0, "Số lượng tồn kho phải lớn hơn hoặc bằng 0").default(0),
  reorder_level: z.coerce.number().min(0, "Ngưỡng báo tồn thấp phải lớn hơn hoặc bằng 0").default(10),
  expiry_date: z.string().optional().or(z.literal("")),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialValues?: Product;
  onSubmit: (values: CreateProductPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductForm({ initialValues, onSubmit, onCancel, isLoading }: ProductFormProps) {
  // Load branches & categories for selection options
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const { data: categoriesRes } = useCategoriesQuery({ limit: 100 });

  const branches = branchesRes?.data || [];
  const categories = categoriesRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues
      ? {
          branch_id: initialValues.branch_id,
          category_id: initialValues.category_id,
          barcode: initialValues.barcode,
          name: initialValues.name,
          unit: initialValues.unit,
          cost_price: initialValues.cost_price,
          sale_price: initialValues.sale_price,
          stock_quantity: initialValues.stock_quantity,
          reorder_level: initialValues.reorder_level,
          expiry_date: initialValues.expiry_date ?? "",
        }
      : {
          branch_id: 0,
          category_id: 0,
          barcode: "",
          name: "",
          unit: "",
          cost_price: 0,
          sale_price: 0,
          stock_quantity: 0,
          reorder_level: 10,
          expiry_date: "",
        },
  });

  const handleFormSubmit = async (values: ProductFormValues) => {
    const payload: CreateProductPayload = {
      branch_id: values.branch_id,
      category_id: values.category_id,
      barcode: values.barcode,
      name: values.name,
      unit: values.unit,
      cost_price: values.cost_price,
      sale_price: values.sale_price,
      stock_quantity: values.stock_quantity,
      reorder_level: values.reorder_level,
      expiry_date: values.expiry_date || undefined,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="branch_id">Chi nhánh *</label>
          <select id="branch_id" className="form-control" {...register("branch_id")}>
            <option value="0">-- Chọn chi nhánh --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.branch_id && <p className="form-error">{errors.branch_id.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="category_id">Danh mục sản phẩm *</label>
          <select id="category_id" className="form-control" {...register("category_id")}>
            <option value="0">-- Chọn danh mục --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category_id && <p className="form-error">{errors.category_id.message}</p>}
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="name">Tên sản phẩm *</label>
          <input
            id="name"
            type="text"
            className="form-control"
            placeholder="VD: Nước suối Aquafina 500ml..."
            {...register("name")}
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="barcode">Mã vạch (Barcode) *</label>
          <input
            id="barcode"
            type="text"
            className="form-control"
            placeholder="VD: 8931234500019..."
            {...register("barcode")}
          />
          {errors.barcode && <p className="form-error">{errors.barcode.message}</p>}
        </div>
      </div>

      <div className="grid-cols-3">
        <div className="form-group">
          <label htmlFor="unit">Đơn vị tính *</label>
          <input
            id="unit"
            type="text"
            className="form-control"
            placeholder="VD: chai, hộp, cái..."
            {...register("unit")}
          />
          {errors.unit && <p className="form-error">{errors.unit.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="cost_price">Giá vốn (VND) *</label>
          <input
            id="cost_price"
            type="number"
            className="form-control"
            {...register("cost_price")}
          />
          {errors.cost_price && <p className="form-error">{errors.cost_price.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="sale_price">Giá bán (VND) *</label>
          <input
            id="sale_price"
            type="number"
            className="form-control"
            {...register("sale_price")}
          />
          {errors.sale_price && <p className="form-error">{errors.sale_price.message}</p>}
        </div>
      </div>

      <div className="grid-cols-3">
        <div className="form-group">
          <label htmlFor="stock_quantity">Số lượng tồn kho</label>
          <input
            id="stock_quantity"
            type="number"
            className="form-control"
            {...register("stock_quantity")}
          />
          {errors.stock_quantity && <p className="form-error">{errors.stock_quantity.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="reorder_level">Ngưỡng cảnh báo tồn thấp</label>
          <input
            id="reorder_level"
            type="number"
            className="form-control"
            {...register("reorder_level")}
          />
          {errors.reorder_level && <p className="form-error">{errors.reorder_level.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="expiry_date">Hạn sử dụng</label>
          <input
            id="expiry_date"
            type="date"
            className="form-control"
            {...register("expiry_date")}
          />
          {errors.expiry_date && <p className="form-error">{errors.expiry_date.message}</p>}
        </div>
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
