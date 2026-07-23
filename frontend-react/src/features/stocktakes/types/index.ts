export type StocktakeStatus = "open" | "closed";

export interface StocktakeItemBatch {
  batch_id: number;
  batch_code: string;
  expiry_date: string | null;
  quantity_remaining: number;
}

export interface StocktakeBatchAdjustment {
  batch_code: string;
  expiry_date: string | null;
  type: "IN" | "OUT";
  quantity: number;
}

export interface StocktakeItem {
  id: number;
  stocktake_id: number;
  product_id: number;
  product_name?: string | null;
  product_barcode?: string | null;
  unit?: string | null;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  batches?: StocktakeItemBatch[];
  batch_adjustments?: StocktakeBatchAdjustment[];
}

export interface CreateStocktakePayload {
  note?: string;
  branch_id?: number;
}

export interface CreateStocktakeItemPayload {
  product_id: number;
  counted_quantity: number;
}

export interface StocktakeSkippedItem {
  product_id: number;
  reason: string;
}

export interface Stocktake {
  id: number;
  branch_id: number;
  branch_name?: string | null;
  created_by: number;
  creator_name?: string | null;
  status: StocktakeStatus;
  note: string | null;
  created_at: string;
  closed_at: string | null;
  items?: StocktakeItem[];
  skipped_items?: StocktakeSkippedItem[];
}
