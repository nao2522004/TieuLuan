import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { useRolesQuery } from "../api/roles.queries";
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UserRole,
} from "../types";

const FALLBACK_ROLES: { value: UserRole; label: string }[] = [
  { value: "cashier", label: "Thu ngân" },
  { value: "leader", label: "Trưởng ca" },
  { value: "admin", label: "Quản trị viên" },
];

const createSchema = z.object({
  full_name: z
    .string()
    .min(1, "Họ tên không được để trống")
    .max(150, "Tối đa 150 ký tự"),
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  branch_id: z.coerce.number().optional(),
  role_code: z.enum(["admin", "leader", "cashier"]).default("cashier"),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  full_name: z
    .string()
    .min(1, "Họ tên không được để trống")
    .max(150, "Tối đa 150 ký tự"),
  branch_id: z.coerce.number().optional(),
  role_code: z.enum(["admin", "leader", "cashier"]),
  is_active: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

interface UserFormProps {
  initialValues?: User;
  currentUserId?: number;
  onSubmitCreate?: (values: CreateUserPayload) => Promise<void>;
  onSubmitEdit?: (values: UpdateUserPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserForm({
  initialValues,
  currentUserId,
  onSubmitCreate,
  onSubmitEdit,
  onCancel,
  isLoading,
}: UserFormProps) {
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];

  const { data: rolesRes } = useRolesQuery();
  const roleOptions =
    rolesRes && rolesRes.length > 0
      ? rolesRes.map((r) => ({ value: r.code as UserRole, label: r.name }))
      : FALLBACK_ROLES;

  if (!initialValues) {
    return (
      <CreateForm
        branches={branches}
        roleOptions={roleOptions}
        onSubmit={onSubmitCreate!}
        onCancel={onCancel}
        isLoading={isLoading}
      />
    );
  }

  return (
    <EditForm
      initialValues={initialValues}
      branches={branches}
      roleOptions={roleOptions}
      isEditingSelf={initialValues.id === currentUserId}
      onSubmit={onSubmitEdit!}
      onCancel={onCancel}
      isLoading={isLoading}
    />
  );
}

function CreateForm({
  branches,
  roleOptions,
  onSubmit,
  onCancel,
  isLoading,
}: {
  branches: { id: number; name: string }[];
  roleOptions: { value: UserRole; label: string }[];
  onSubmit: (values: CreateUserPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role_code: "cashier",
    },
  });

  const submit = async (values: CreateFormValues) => {
    await onSubmit({
      full_name: values.full_name,
      email: values.email,
      password: values.password,
      branch_id: values.branch_id || undefined,
      role_code: values.role_code,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="form-group">
        <label htmlFor="full_name">Họ và tên *</label>
        <input
          id="full_name"
          type="text"
          className="form-control"
          placeholder="VD: Nguyễn Văn A"
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="form-error">{errors.full_name.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          className="form-control"
          placeholder="VD: cashier3@store.local"
          {...register("email")}
        />
        {errors.email && <p className="form-error">{errors.email.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Mật khẩu *</label>
        <input
          id="password"
          type="password"
          className="form-control"
          placeholder="Tối thiểu 6 ký tự"
          {...register("password")}
        />
        {errors.password && (
          <p className="form-error">{errors.password.message}</p>
        )}
      </div>

      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="branch_id">Chi nhánh</label>
          <select
            id="branch_id"
            className="form-control"
            {...register("branch_id")}
          >
            <option value="">Không gắn chi nhánh (admin)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="role_code">Vai trò *</label>
          <select
            id="role_code"
            className="form-control"
            {...register("role_code")}
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
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
          {isLoading ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </div>
    </form>
  );
}

function EditForm({
  initialValues,
  branches,
  roleOptions,
  isEditingSelf,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialValues: User;
  branches: { id: number; name: string }[];
  roleOptions: { value: UserRole; label: string }[];
  isEditingSelf: boolean;
  onSubmit: (values: UpdateUserPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      full_name: initialValues.full_name,
      branch_id: initialValues.branch_id ?? undefined,
      role_code: initialValues.role,
      is_active: initialValues.is_active,
    },
  });

  const submit = async (values: EditFormValues) => {
    await onSubmit({
      full_name: values.full_name,
      branch_id: values.branch_id || undefined,
      role_code: values.role_code,
      is_active: values.is_active,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="form-group">
        <label htmlFor="edit_email">Email</label>
        <input
          id="edit_email"
          type="email"
          className="form-control"
          value={initialValues.email}
          disabled
        />
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginTop: "6px",
          }}
        >
          Email không thể thay đổi.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="edit_full_name">Họ và tên *</label>
        <input
          id="edit_full_name"
          type="text"
          className="form-control"
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="form-error">{errors.full_name.message}</p>
        )}
      </div>

      <div className="grid-cols-2">
        <div className="form-group">
          <label htmlFor="edit_branch_id">Chi nhánh</label>
          <select
            id="edit_branch_id"
            className="form-control"
            {...register("branch_id")}
          >
            <option value="">Không gắn chi nhánh (admin)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="edit_role_code">Vai trò *</label>
          <select
            id="edit_role_code"
            className="form-control"
            disabled={isEditingSelf}
            {...register("role_code")}
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {isEditingSelf && (
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              Không thể tự đổi vai trò của chính mình.
            </p>
          )}
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
          id="edit_is_active"
          type="checkbox"
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
          disabled={isEditingSelf}
          {...register("is_active")}
        />
        <label
          htmlFor="edit_is_active"
          style={{ margin: 0, cursor: "pointer" }}
        >
          Tài khoản đang hoạt động
        </label>
      </div>
      {isEditingSelf && (
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginTop: "-14px",
            marginBottom: "16px",
          }}
        >
          Không thể tự khóa tài khoản của chính mình.
        </p>
      )}

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
          {isLoading ? "Đang lưu..." : "Cập nhật"}
        </button>
      </div>
    </form>
  );
}
