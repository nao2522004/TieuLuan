export type InventoryTransactionType = "IN" | "OUT";
export type InventoryTransactionSource =
  | "ORDER"
  | "INBOUND"
  | "ADJUSTMENT"
  | "STOCKTAKE";

export interface InventoryTransaction {
  id: number;
  product_id: number;
  product_name?: string;
  product_barcode?: string;
  type: InventoryTransactionType;
  source: InventoryTransactionSource;
  reason: string | null;
  quantity: number;
  unit_cost: number | null;
  note: string | null;
  created_by: number;
  created_at: string;
}

export interface CreateInboundPayload {
  product_id: number;
  quantity: number;
  unit_cost?: number;
  note?: string;
  expiry_date?: string;
  batch_code?: string;
}

export interface CreateAdjustmentPayload {
  product_id: number;
  quantity: number;
  reason: string;
  note?: string;
  batch_id?: number;
}
