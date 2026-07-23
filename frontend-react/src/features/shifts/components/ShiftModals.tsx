import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useOpenShiftMutation,
  useCloseShiftMutation,
  useCorrectClosedShiftMutation,
  useCashiersQuery,
} from "../api/shifts.queries";
import { useAuth } from "@/features/auth";
import { useBranchesQuery } from "@/features/branches/api/branches.queries";
import { Modal, ModalTitleBar } from "@/components/Modal";
import type { Shift } from "../types";

const ROLE_LABEL: Record<string, string> = {
  cashier: "Thu ngân",
  leader: "Trưởng ca",
  admin: "Admin",
};

//  Open Shift Modal
const openSchema = z.object({
  opening_cash: z.coerce.number().min(0, "Số tiền đầu ca phải >= 0"),
  branch_id: z.coerce.number().optional(),
  note: z.string().max(255).optional().or(z.literal("")),
});
type OpenFormValues = z.infer<typeof openSchema>;

interface Staff {
  id: number;
  full_name: string;
  role_codes: string[];
}

interface OpenShiftModalProps {
  onClose: () => void;
}

export function OpenShiftModal({ onClose }: OpenShiftModalProps) {
  const { user } = useAuth();
  const { data: branchesRes } = useBranchesQuery({ limit: 100 });
  const branches = branchesRes?.data || [];
  const mutation = useOpenShiftMutation();

  const [selectedStaff, setSelectedStaff] = useState<Staff[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OpenFormValues>({
    resolver: zodResolver(openSchema),
    defaultValues: { opening_cash: 0, note: "" },
  });

  const selectedBranchId = watch("branch_id") || user?.branch_id;

  const { data: suggestions = [] } = useCashiersQuery(
    selectedBranchId ? Number(selectedBranchId) : undefined,
    searchInput.trim(),
    roleFilter || undefined,
  );

  // Lọc bỏ những người đã chọn
  const filteredSuggestions = suggestions.filter(
    (s) => !selectedStaff.find((sel) => sel.id === s.id),
  );

  const addStaff = (staff: Staff) => {
    setSelectedStaff((prev) => [...prev, staff]);
    setSearchInput("");
    setShowDropdown(false);
  };

  const removeStaff = (id: number) => {
    setSelectedStaff((prev) => prev.filter((s) => s.id !== id));
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = async (values: OpenFormValues) => {
    await mutation.mutateAsync({
      opening_cash: values.opening_cash,
      branch_id: user?.branch_id ? undefined : values.branch_id,
      note: values.note || undefined,
      cashier_ids: selectedStaff.map((s) => s.id),
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

          {selectedBranchId && (
            <div className="form-group">
              <label style={{ fontWeight: "bold" }}>
                Nhân viên trong ca *
              </label>

              {/* Ô tìm kiếm + bộ lọc vai trò */}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div ref={dropdownRef} style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm theo tên hoặc ID nhân viên..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {/* Dropdown gợi ý */}
                  {showDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 200,
                        marginTop: 4,
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-sm)",
                        maxHeight: 220,
                        overflowY: "auto",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    >
                      {filteredSuggestions.length === 0 ? (
                        <div
                          style={{
                            padding: "10px 14px",
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {searchInput
                            ? "Không tìm thấy nhân viên khớp."
                            : "Nhập tên hoặc ID để tìm..."}
                        </div>
                      ) : (
                        filteredSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => addStaff(s)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              padding: "10px 14px",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              borderBottom: "1px solid var(--border-color)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(99,102,241,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "none";
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                {s.full_name}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  marginLeft: 8,
                                }}
                              >
                                #{s.id}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {(s.role_codes ?? []).map((rc) => (
                                <span
                                  key={rc}
                                  className="badge badge-info"
                                  style={{ fontSize: "0.7rem" }}
                                >
                                  {ROLE_LABEL[rc] ?? rc}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Lọc theo vai trò */}
                <select
                  className="form-control"
                  style={{ width: 140, flexShrink: 0 }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">Tất cả vai trò</option>
                  <option value="cashier">Thu ngân</option>
                  <option value="leader">Trưởng ca</option>
                </select>
              </div>

              {/* Danh sách đã chọn */}
              {selectedStaff.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {selectedStaff.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 9999,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      <span>
                        {s.full_name}{" "}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            fontWeight: 400,
                          }}
                        >
                          #{s.id}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeStaff(s.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--danger)",
                          padding: 0,
                          lineHeight: 1,
                          fontSize: "1rem",
                        }}
                        title="Xóa khỏi danh sách"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedStaff.length === 0 && (
                <p
                  style={{
                    marginTop: 6,
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Chưa chọn nhân viên nào. Tìm và chọn từ danh sách gợi ý.
                </p>
              )}
            </div>
          )}
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
            {mutation.isPending ? "Đang mở ca..." : "Mở ca"}
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

// Correct Close Shift Modal (sửa thông tin ca đã đóng)
interface CorrectCloseModalProps {
  shift: Shift;
  onClose: () => void;
}

export function CorrectCloseModal({ shift, onClose }: CorrectCloseModalProps) {
  const mutation = useCorrectClosedShiftMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CloseFormValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: {
      closing_cash: shift.closing_cash ?? 0,
      note: shift.note ?? "",
    },
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
        title={`✏️ Điều chỉnh thông tin đóng ca #${shift.id}`}
        onClose={onClose}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="modal-content">
          <div
            className="card"
            style={{
              marginBottom: "16px",
              background: "rgba(245,158,11,0.05)",
              borderColor: "rgba(245,158,11,0.2)",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              <strong>Chi nhánh:</strong>{" "}
              {shift.branch_name ?? `#${shift.branch_id}`} &nbsp;|&nbsp;
              <strong>Nhân viên:</strong>{" "}
              {shift.user_full_name ?? `#${shift.user_id}`}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
              <strong>Quỹ dự kiến:</strong>{" "}
              {shift.expected_cash?.toLocaleString("vi-VN") ?? 0} đ
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="correct_closing_cash">
              Số tiền quỹ thực tế điều chỉnh (VND) *
            </label>
            <input
              id="correct_closing_cash"
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
            <label htmlFor="correct_close_note">Ghi chú điều chỉnh</label>
            <input
              id="correct_close_note"
              type="text"
              className="form-control"
              placeholder="Lý do điều chỉnh..."
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
            className="btn btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Đang lưu..." : "Lưu điều chỉnh"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
