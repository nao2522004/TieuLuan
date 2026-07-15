export interface Return {
  id: number;
  order_item_id: number;
  quantity: number;
  refund_amount: number;
  reason: string | null;
  created_by: number;
  created_at: string;
  zalopay_m_refund_id: string | null;
  zalopay_refund_id: string | null;
  zalopay_refund_status: string | null;
}

export interface CreateReturnPayload {
  order_item_id: number;
  quantity: number;
  reason?: string;
}
