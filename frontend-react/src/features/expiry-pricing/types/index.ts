export interface ExpiryDiscountRule {
  id: number;
  days_before_expiry: number;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExpiryDiscountRulePayload {
  days_before_expiry: number;
  discount_percent: number;
  is_active?: boolean;
}

export interface UpdateExpiryDiscountRulePayload extends Partial<CreateExpiryDiscountRulePayload> {}
