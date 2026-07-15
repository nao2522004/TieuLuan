export interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  bank_bin?: string;
  bank_account_no?: string;
  bank_account_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchPayload {
  name: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
  bank_bin?: string;
  bank_account_no?: string;
  bank_account_name?: string;
}

export interface UpdateBranchPayload extends Partial<CreateBranchPayload> {}
