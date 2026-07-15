export default function UsersPage() {
  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>👥 Quản lý Nhân viên</h2>
          <p>Danh sách tài khoản nhân viên trong hệ thống</p>
        </div>
      </div>
      <div className="card" style={{ textAlign: "center", padding: "48px" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚧</div>
        <h3 style={{ marginBottom: "8px" }}>Tính năng đang được phát triển</h3>
        <p style={{ color: "var(--text-muted)" }}>
          API backend chưa có đủ endpoint để quản lý nhân viên (tạo, sửa, phân quyền). Tính năng này sẽ được triển khai trong phiên bản tiếp theo.
        </p>
      </div>
    </div>
  );
}
