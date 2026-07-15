export interface Return {
  id: number;
  order_item_id: number;
  quantity: number;
  refund_amount: number;
  reason: string | null;
  created_by: number;
  created_at: string;
}

export interface CreateReturnPayload {
  order_item_id: number;
  quantity: number;
  reason?: string;
}
