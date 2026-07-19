export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  original_unit_price?: number | null;
  discount_percent?: number;
}

export interface Order {
  id: number;
  branch_id: number;
  shift_id: number;
  created_by: number;
  status: "completed" | "cancelled";
  payment_method: "cash" | "card" | "transfer";
  payment_status: "paid" | "pending";
  discount_amount: number;
  total_amount: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  qr_content: string | null;
  qr_code: string | null;
  zalopay_app_trans_id: string | null;
  zalopay_zp_trans_id: string | null;
  promotion_code: string | null;
  promotion_type?: "percent" | "fixed" | null;
  promotion_value?: number | null;
}

export interface CreateOrderItemPayload {
  product_id: number;
  quantity: number;
}

export interface CreateOrderPayload {
  payment_method: "cash" | "card" | "transfer";
  discount_amount?: number;
  promotion_code?: string;
  items: CreateOrderItemPayload[];
}

export interface CartItem {
  product_id: number;
  product_name: string;
  barcode: string;
  unit: string;
  unit_price: number;
  original_price?: number;
  discount_percent?: number;
  quantity: number;
}

export * from "../components/ReceiptPrintView";
