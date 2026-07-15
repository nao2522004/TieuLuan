export interface ZaloPayCreateOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  zp_trans_token?: string;
  order_url?: string;
  order_token?: string;
  qr_code?: string;
}

export interface ZaloPayQueryOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  is_processing?: boolean;
  amount?: number;
  zp_trans_id?: number;
  server_time?: number;
  discount_amount?: number;
}

export interface ZaloPayCancelOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
}

export interface ZaloPayRefundResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  refund_id?: string; // string or number, string is safer
}

export interface ZaloPayQueryRefundResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
}
