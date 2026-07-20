export type StocktakeStatus = "open" | "closed";

export interface StocktakeItem {
  id: number;
  stocktake_id: number;
  product_id: number;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
}

export interface Stocktake {
  id: number;
  branch_id: number;
  created_by: number;
  status: StocktakeStatus;
  note: string | null;
  created_at: string;
  closed_at: string | null;
  items?: StocktakeItem[];
}

export interface CreateStocktakePayload {
  note?: string;
  branch_id?: number;
}

export interface CreateStocktakeItemPayload {
  product_id: number;
  counted_quantity: number;
}
