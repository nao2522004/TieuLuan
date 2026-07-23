import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.string().min(1, "Email không được để trống").email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError("root", { message: err.message });
      } else {
        setError("root", { message: "Đã có lỗi xảy ra. Vui lòng thử lại." });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          className="form-control"
          placeholder="admin@store.local"
          {...register("email")}
        />
        {errors.email && <p className="form-error" role="alert">{errors.email.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="form-control"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && <p className="form-error" role="alert">{errors.password.message}</p>}
      </div>

      {errors.root && <p className="form-error" style={{ marginBottom: "16px", textAlign: "center" }} role="alert">{errors.root.message}</p>}

      <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={isLoggingIn}>
        {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
