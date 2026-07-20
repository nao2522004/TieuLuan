import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/features/products/api/products.api";
import type { Product } from "@/features/products/types";

interface ProductPickerProps {
  branchId?: number;
  value?: Product;
  onChange: (product: Product) => void;
  onClear?: () => void;
  disabled?: boolean;
}

export function ProductPicker({
  branchId,
  value,
  onChange,
  onClear,
  disabled,
}: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const trimmed = search.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["products", "picker", branchId, trimmed],
    queryFn: () =>
      productsApi.getProducts({
        branch_id: branchId,
        search: trimmed,
        limit: 8,
      }),
    enabled: !!branchId && trimmed.length > 0,
  });
  const results = data?.data ?? [];

  if (value) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{value.name}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Mã vạch: {value.barcode} · Tồn kho hiện tại:{" "}
            <strong>{value.stock_quantity}</strong> {value.unit}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
          onClick={() => {
            onClear?.();
            setSearch("");
          }}
        >
          Đổi sản phẩm
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        className="form-control"
        placeholder={
          branchId ? "Tìm theo tên hoặc mã vạch..." : "Chọn chi nhánh trước"
        }
        value={search}
        disabled={!branchId || disabled}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && branchId && trimmed && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            marginTop: 4,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {isFetching ? (
            <div
              style={{
                padding: 12,
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              Đang tìm...
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: 12,
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              Không tìm thấy sản phẩm trong chi nhánh này.
            </div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {p.name}
                  </div>
                  <div
                    style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    {p.barcode}
                  </div>
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  {p.stock_quantity} {p.unit}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
