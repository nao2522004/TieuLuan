export type ExpiryDiscountRuleScope = "expiry" | "all_products";

export interface ExpiryDiscountRule {
  id: number;
  scope: ExpiryDiscountRuleScope;
  days_before_expiry: number | null;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExpiryDiscountRulePayload {
  scope?: ExpiryDiscountRuleScope;
  days_before_expiry?: number;
  discount_percent: number;
  is_active?: boolean;
}

export interface UpdateExpiryDiscountRulePayload extends Partial<CreateExpiryDiscountRulePayload> {}
