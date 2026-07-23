export interface ShiftCashier {
  id: number;
  full_name: string;
}

export interface Shift {
  id: number;
  branch_id: number;
  branch_name: string | null;
  user_id: number;
  user_full_name: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  note: string | null;
  opened_at: string;
  closed_at: string | null;
  cashiers?: ShiftCashier[];
}

export interface ShiftOrderSummary {
  id: number;
  created_by: number;
  created_by_name: string | null;
  payment_method: "cash" | "card" | "transfer";
  payment_status: "pending" | "paid";
  status: "completed" | "cancelled";
  total_amount: number;
  refunded_amount?: number;
  created_at: string;
}

export interface ShiftReturnSummary {
  id: number;
  order_id: number;
  order_item_id: number;
  product_name: string | null;
  quantity: number;
  refund_amount: number;
  payment_method: "cash" | "card" | "transfer";
  reason: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
}

export interface ShiftDetail extends Shift {
  orders_count: number;
  cash_orders_total: number;
  card_orders_total: number;
  transfer_orders_total: number;
  cash_returns_total: number;
  card_returns_total: number;
  transfer_returns_total: number;
  live_expected_cash: number;
  orders: ShiftOrderSummary[];
  returns: ShiftReturnSummary[]; // mới
}

export interface OpenShiftPayload {
  opening_cash: number;
  branch_id?: number;
  note?: string;
  cashier_ids: number[];
}

export interface CloseShiftPayload {
  closing_cash: number;
  note?: string;
}

export interface UpdateClosingPayload {
  closing_cash?: number;
  note?: string;
}
