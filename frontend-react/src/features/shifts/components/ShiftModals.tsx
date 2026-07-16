import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useOpenShiftMutation,
  useCloseShiftMutation,
} from "../api/shifts.queries";
import { useAuth } from "@/features/auth";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { Modal, ModalTitleBar } from "@/components/Modal";
import type { Shift } from "../types";

//  Open Shift Modal
const openSchema = z.object({
  opening_cash: z.coerce.number().min(0, "Số tiền đầu ca phải >= 0"),
  branch_id: z.coerce.number().optional(),
  note: z.string().max(255).optional().or(z.literal("")),
});
type OpenFormValues = z.infer<typeof openSchema>;

interface OpenShiftModalProps {
  onClose: () => void;
}

export function OpenShiftModal({ onClose }: OpenShiftModalProps) {
  const { user } = useAuth();
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];
  const mutation = useOpenShiftMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpenFormValues>({
    resolver: zodResolver(openSchema),
    defaultValues: { opening_cash: 0, note: "" },
  });

  const onSubmit = async (values: OpenFormValues) => {
    await mutation.mutateAsync({
      opening_cash: values.opening_cash,
      branch_id: user?.branch_id ? undefined : values.branch_id,
      note: values.note || undefined,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitleBar title="⏱️ Mở ca làm việc" onClose={onClose} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="modal-content">
          {!user?.branch_id && (
            <div className="form-group">
              <label htmlFor="branch_id">Chi nhánh *</label>
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
            <label htmlFor="opening_cash">Số tiền quỹ đầu ca (VND) *</label>
            <input
              id="opening_cash"
              type="number"
              min={0}
              step={1000}
              className="form-control"
              {...register("opening_cash")}
            />
            {errors.opening_cash && (
              <p className="form-error">{errors.opening_cash.message}</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="open_note">Ghi chú (tùy chọn)</label>
            <input
              id="open_note"
              type="text"
              className="form-control"
              placeholder="VD: Ca sáng..."
              {...register("note")}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-success"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Đang mở ca..." : "✅ Mở ca"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

//  Close Shift Modal
const closeSchema = z.object({
  closing_cash: z.coerce.number().min(0, "Số tiền cuối ca phải >= 0"),
  note: z.string().max(255).optional().or(z.literal("")),
});
type CloseFormValues = z.infer<typeof closeSchema>;

interface CloseShiftModalProps {
  shift: Shift;
  onClose: () => void;
}

export function CloseShiftModal({ shift, onClose }: CloseShiftModalProps) {
  const mutation = useCloseShiftMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CloseFormValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: { closing_cash: 0, note: "" },
  });

  const onSubmit = async (values: CloseFormValues) => {
    await mutation.mutateAsync({
      id: shift.id,
      payload: {
        closing_cash: values.closing_cash,
        note: values.note || undefined,
      },
    });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitleBar
        title={`🔒 Đóng ca làm việc #${shift.id}`}
        onClose={onClose}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="modal-content">
          <div
            className="card"
            style={{
              marginBottom: "16px",
              background: "rgba(99,102,241,0.05)",
              borderColor: "rgba(99,102,241,0.2)",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              <strong>Chi nhánh:</strong>{" "}
              {shift.branch_name ?? `#${shift.branch_id}`} &nbsp;|&nbsp;
              <strong>Nhân viên:</strong>{" "}
              {shift.user_full_name ?? `#${shift.user_id}`}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
              <strong>Quỹ đầu ca:</strong>{" "}
              {shift.opening_cash.toLocaleString("vi-VN")} đ
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              Mở lúc {new Date(shift.opened_at).toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="closing_cash">
              Số tiền quỹ thực tế cuối ca (VND) *
            </label>
            <input
              id="closing_cash"
              type="number"
              min={0}
              step={1000}
              className="form-control"
              {...register("closing_cash")}
            />
            {errors.closing_cash && (
              <p className="form-error">{errors.closing_cash.message}</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="close_note">Ghi chú (tùy chọn)</label>
            <input
              id="close_note"
              type="text"
              className="form-control"
              placeholder="VD: Đủ quỹ, không phát sinh..."
              {...register("note")}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-danger"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Đang đóng ca..." : "🔒 Đóng ca"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
