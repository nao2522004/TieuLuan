import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Branch, CreateBranchPayload } from "../types";

const branchSchema = z.object({
  name: z.string().min(1, "Tên chi nhánh không được để trống").max(150, "Tối đa 150 ký tự"),
  address: z.string().max(255, "Tối đa 255 ký tự").optional().or(z.literal("")),
  phone: z.string().max(20, "Tối đa 20 ký tự").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  bank_bin: z.string().max(10, "Mã BIN tối đa 10 ký tự").optional().or(z.literal("")),
  bank_account_no: z.string().max(30, "Số tài khoản tối đa 30 ký tự").optional().or(z.literal("")),
  bank_account_name: z
    .string()
    .max(150, "Tên tài khoản tối đa 150 ký tự")
    .transform((val) => val?.toUpperCase())
    .optional()
    .or(z.literal("")),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchFormProps {
  initialValues?: Branch;
  onSubmit: (values: CreateBranchPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BranchForm({ initialValues, onSubmit, onCancel, isLoading }: BranchFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          address: initialValues.address ?? "",
          phone: initialValues.phone ?? "",
          is_active: initialValues.is_active,
          bank_bin: initialValues.bank_bin ?? "",
          bank_account_no: initialValues.bank_account_no ?? "",
          bank_account_name: initialValues.bank_account_name ?? "",
        }
      : {
          name: "",
          address: "",
          phone: "",
          is_active: true,
          bank_bin: "",
          bank_account_no: "",
          bank_account_name: "",
        },
  });

  const handleFormSubmit = async (values: BranchFormValues) => {
    // Clean up empty fields to prevent sending empty strings instead of null
    const payload: CreateBranchPayload = {
      name: values.name,
      address: values.address || undefined,
      phone: values.phone || undefined,
      is_active: values.is_active,
      bank_bin: values.bank_bin || undefined,
      bank_account_no: values.bank_account_no || undefined,
      bank_account_name: values.bank_account_name || undefined,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="form-group">
        <label htmlFor="name">Tên chi nhánh *</label>
        <input
          id="name"
          type="text"
          className="form-control"
          placeholder="Nhập tên chi nhánh..."
          {...register("name")}
        />
        {errors.name && <p className="form-error">{errors.name.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="address">Địa chỉ</label>
        <input
          id="address"
          type="text"
          className="form-control"
          placeholder="Nhập địa chỉ..."
          {...register("address")}
        />
        {errors.address && <p className="form-error">{errors.address.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="phone">Số điện thoại</label>
        <input
          id="phone"
          type="text"
          className="form-control"
          placeholder="Nhập số điện thoại..."
          {...register("phone")}
        />
        {errors.phone && <p className="form-error">{errors.phone.message}</p>}
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

      <fieldset style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
        <legend style={{ padding: "0 8px", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Thông tin thanh toán VietQR</legend>
        
        <div className="form-group">
          <label htmlFor="bank_bin">Mã BIN Ngân hàng (Chuẩn Napas)</label>
          <input
            id="bank_bin"
            type="text"
            className="form-control"
            placeholder="VD: 970422 (MB Bank), 970415 (VietinBank)..."
            {...register("bank_bin")}
          />
          {errors.bank_bin && <p className="form-error">{errors.bank_bin.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="bank_account_no">Số tài khoản ngân hàng</label>
          <input
            id="bank_account_no"
            type="text"
            className="form-control"
            placeholder="Nhập số tài khoản..."
            {...register("bank_account_no")}
          />
          {errors.bank_account_no && <p className="form-error">{errors.bank_account_no.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="bank_account_name">Tên chủ tài khoản (Viết hoa không dấu)</label>
          <input
            id="bank_account_name"
            type="text"
            className="form-control"
            placeholder="VD: NGUYEN VAN A"
            style={{ textTransform: "uppercase" }}
            {...register("bank_account_name")}
          />
          {errors.bank_account_name && <p className="form-error">{errors.bank_account_name.message}</p>}
        </div>
      </fieldset>

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
