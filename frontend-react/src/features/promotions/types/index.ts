export type PromotionType = "percent" | "fixed";

export interface Promotion {
  id: number;
  code: string;
  name: string;
  type: PromotionType;
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePromotionPayload {
  code: string;
  name: string;
  type: PromotionType;
  value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string;
}

export interface UpdatePromotionPayload extends Partial<CreatePromotionPayload> {}
