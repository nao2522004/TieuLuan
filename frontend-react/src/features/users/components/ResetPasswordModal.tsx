import { useState } from "react";
import { Modal, ModalTitleBar } from "@/components/Modal";
import { useResetPasswordMutation } from "../api/users.queries";
import type { User } from "../types";

interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
}

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useResetPasswordMutation();

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    setError(null);
    await mutation.mutateAsync({
      id: user.id,
      payload: { new_password: newPassword },
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} maxWidth={420}>
      <ModalTitleBar
        title={`🔑 Reset mật khẩu — ${user.full_name}`}
        onClose={onClose}
      />
      <div className="modal-content">
        <p style={{ marginBottom: "16px", fontSize: "0.9rem" }}>
          Sau khi reset, mọi phiên đăng nhập cũ của nhân viên này sẽ bị vô hiệu
          hóa (buộc đăng nhập lại bằng mật khẩu mới).
        </p>
        <div className="form-group">
          <label htmlFor="new_password">Mật khẩu mới *</label>
          <input
            id="new_password"
            type="password"
            className="form-control"
            placeholder="Tối thiểu 6 ký tự"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
          className="btn btn-danger"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Đang reset..." : "Reset mật khẩu"}
        </button>
      </div>
    </Modal>
  );
}
