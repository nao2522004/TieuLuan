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
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductAlerts {
  low_stock: Product[];
  expiring_soon: Product[];
}

export interface CreateProductPayload {
  branch_id: number;
  category_id: number;
  barcode: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity?: number;
  reorder_level?: number;
  expiry_date?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}
