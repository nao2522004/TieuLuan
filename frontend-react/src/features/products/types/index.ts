export interface Product {
  id: number;
  branch_id: number;
  category_id: number;
  barcode: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  reorder_level: number;
  effective_price: number;
  discount_percent: number;
  is_expiry_discount_applied: boolean;
  expiry_date?: string | null;
  nearest_expiry_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductBatch {
  batch_id: number;
  product_id: number;
  batch_code: string;
  expiry_date: string | null;
  quantity_remaining: number;
  product_name: string;
  barcode: string;
  unit: string;
  sale_price?: number;
}

export interface ProductBatchDetail {
  id: number;
  product_id: number;
  batch_code: string;
  expiry_date: string | null;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number | null;
  received_at: string;
  created_by: number | null;
}

export interface ProductAlerts {
  low_stock: Product[];
  expiring_soon: ProductBatch[];
}

export interface CreateProductPayload {
  branch_id: number;
  category_id: number;
  barcode?: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity?: number;
  reorder_level?: number;
  expiry_date?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}

export interface UpdateProductBatchPayload {
  batch_code?: string;
  expiry_date?: string | null;
  unit_cost?: number | null;
}
