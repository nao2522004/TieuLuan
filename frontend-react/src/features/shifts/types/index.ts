export interface Shift {
  id: number;
  branch_id: number;
  user_id: number;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  note: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface OpenShiftPayload {
  opening_cash: number;
  branch_id?: number;
  note?: string;
}

export interface CloseShiftPayload {
  closing_cash: number;
  note?: string;
}
