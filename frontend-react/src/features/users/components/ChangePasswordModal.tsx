import { useState } from "react";
import { Modal, ModalTitleBar } from "@/components/Modal";
import { useChangeOwnPasswordMutation } from "../api/users.queries";

interface ChangePasswordModalProps {
  onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useChangeOwnPasswordMutation();

  const handleSubmit = async () => {
    if (!oldPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới tối thiểu 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync({
        old_password: oldPassword,
        new_password: newPassword,
      });
      onClose();
    } catch {
      // Lỗi AUTH_INVALID_OLD_PASSWORD đã hiển thị qua toast interceptor
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={420}>
      <ModalTitleBar title="🔒 Đổi mật khẩu" onClose={onClose} />
      <div className="modal-content">
        <div className="form-group">
          <label htmlFor="old_password">Mật khẩu hiện tại *</label>
          <input
            id="old_password"
            type="password"
            className="form-control"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="new_password_self">Mật khẩu mới *</label>
          <input
            id="new_password_self"
            type="password"
            className="form-control"
            placeholder="Tối thiểu 6 ký tự"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm_password">Xác nhận mật khẩu mới *</label>
          <input
            id="confirm_password"
            type="password"
            className="form-control"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
      <div className="modal-footer">
        <button
          className="btn btn-secondary"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Hủy
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
      </div>
    </Modal>
  );
}
