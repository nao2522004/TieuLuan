import { useState } from "react";
import {
  useExpiryRulesQuery,
  useCreateExpiryRuleMutation,
  useUpdateExpiryRuleMutation,
  useDeleteExpiryRuleMutation,
} from "../api/expiry-pricing.queries";
import { ExpiryRuleForm } from "../components/ExpiryRuleForm";
import { Modal, ModalTitleBar } from "@/components/Modal";
import type {
  ExpiryDiscountRule,
  CreateExpiryDiscountRulePayload,
} from "../types";

export default function ExpiryPricingPage() {
  const { data: rules = [], isLoading } = useExpiryRulesQuery();
  const createMutation = useCreateExpiryRuleMutation();
  const updateMutation = useUpdateExpiryRuleMutation();
  const deleteMutation = useDeleteExpiryRuleMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<
    ExpiryDiscountRule | undefined
  >(undefined);

  const sortedRules = [...rules].sort(
    (a, b) => a.days_before_expiry - b.days_before_expiry,
  );

  const handleOpenCreate = () => {
    setSelectedRule(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: ExpiryDiscountRule) => {
    setSelectedRule(rule);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedRule(undefined);
  };

  const handleSubmit = async (payload: CreateExpiryDiscountRulePayload) => {
    if (selectedRule) {
      await updateMutation.mutateAsync({ id: selectedRule.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    handleClose();
  };

  const handleDelete = async (rule: ExpiryDiscountRule) => {
    if (
      window.confirm(
        `Xóa quy tắc "còn ${rule.days_before_expiry} ngày -> giảm ${rule.discount_percent}%"?`,
      )
    ) {
      await deleteMutation.mutateAsync(rule.id);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header" style={{ marginBottom: "24px" }}>
        <div>
          <h2>⏳ Giảm giá theo hạn sử dụng</h2>
          <p>
            Cấu hình bậc thang: sản phẩm còn bao nhiêu ngày tới hạn thì tự động
            giảm bao nhiêu %. Áp dụng real-time ở Products, POS, cảnh báo tồn
            kho.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm quy tắc
        </button>
      </div>

      <div
        className="card"
        style={{
          marginBottom: "24px",
          borderColor: "rgba(99,102,241,0.2)",
          background: "rgba(99,102,241,0.04)",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.85rem" }}>
          💡 Nếu 1 sản phẩm khớp <strong>nhiều quy tắc</strong> cùng lúc, hệ
          thống sẽ tự động lấy mức giảm giá <strong>cao nhất</strong>. Giá hiển
          thị luôn được tính real-time theo ngày hiện tại, không lưu cache.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          Đang tải danh sách...
        </div>
      ) : sortedRules.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-secondary)",
          }}
        >
          Chưa có quy tắc nào. Nhấn "Thêm quy tắc" để bắt đầu.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Điều kiện áp dụng</th>
                  <th>Mức giảm</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.id}</td>
                    <td>
                      {rule.days_before_expiry === 0
                        ? "Đã hết hạn sử dụng"
                        : `Còn <= ${rule.days_before_expiry} ngày tới hạn`}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--danger)" }}>
                        − {rule.discount_percent}%
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${rule.is_active ? "badge-success" : "badge-danger"}`}
                      >
                        {rule.is_active ? "Đang áp dụng" : "Tạm tắt"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="flex-row-end" style={{ gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenEdit(rule)}
                          style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(rule)}
                          style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <Modal onClose={handleClose} maxWidth={480}>
          <ModalTitleBar
            title={selectedRule ? "Cập nhật quy tắc" : "Thêm quy tắc mới"}
            onClose={handleClose}
          />
          <div className="modal-content">
            <ExpiryRuleForm
              initialValues={selectedRule}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
