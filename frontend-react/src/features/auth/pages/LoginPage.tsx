import { LoginForm } from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="login-page-container">
      <div className="login-card card animate-slide-in">
        <div className="login-logo-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <h2>Hệ thống StoreERP</h2>
          <p>Đăng nhập tài khoản quản trị hoặc nhân viên</p>
        </div>
        <LoginForm />
      </div>

      <style>{`
        .login-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-primary);
          padding: 20px;
          background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 40%),
                      radial-gradient(circle at bottom left, rgba(239, 68, 68, 0.03), transparent 30%);
        }
        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .login-logo-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 32px;
        }
        .login-logo-header svg {
          margin-bottom: 16px;
        }
        .login-logo-header h2 {
          font-size: 1.5rem;
          margin-bottom: 8px;
          background: linear-gradient(135deg, white, var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-logo-header p {
          font-size: 0.9rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
